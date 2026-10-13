import { sendBrevoLeadNotification, reconcileBrevoLeadNotification } from './business-integrations.js';
import { verifyAdminToken } from './admin-auth.js';

const BATCH_SIZE = 5;
const MAX_SEND_ATTEMPTS = 5;
const MAX_RECONCILE_ATTEMPTS = 12;
const LEASE_MS = 120000;
const due = (attempts, now) => now + Math.min(3600000, 60000 * 2 ** Math.min(attempts, 6));
const changed = result => Number(result?.meta?.changes || 0) === 1;

// D1 batch is a transaction: receipt, lead and email intent commit together.
export async function storeLeadWithEmailIntent(db, {key, fingerprint, customerId, source, name, phone, carId, message}) {
  const notificationId = `leadmail-${crypto.randomUUID()}`;
  const results = await db.batch([
    db.prepare("INSERT INTO xtra_lead_intake_requests (idempotency_key,source,payload_fingerprint,status) VALUES (?,?,?,'claimed')").bind(key,source,fingerprint),
    db.prepare('INSERT INTO leads (name,phone,car_id,message) VALUES (?,?,?,?)').bind(name,phone,carId,message),
    db.prepare("UPDATE xtra_lead_intake_requests SET lead_id=last_insert_rowid(),customer_id=?,status='stored',updated_at=CURRENT_TIMESTAMP WHERE idempotency_key=? AND lead_id IS NULL").bind(customerId || null,key),
    db.prepare('INSERT INTO xtra_lead_email_outbox (notification_id,lead_id,source) SELECT ?,lead_id,source FROM xtra_lead_intake_requests WHERE idempotency_key=?').bind(notificationId,key)
  ]);
  const leadId = Number(results[1]?.meta?.last_row_id);
  if (!Number.isSafeInteger(leadId) || leadId <= 0) throw new Error('lead_storage_receipt_missing');
  return leadId;
}

export function emailOutcome(result, attempts) {
  if (result?.ok === true) return {state:'accepted', code:'accepted'};
  if (result?.skipped) return {state:attempts >= MAX_SEND_ATTEMPTS ? 'blocked' : 'retry', code:'not_configured'};
  // An explicit rate-limit rejection is safe to retry; transport/5xx outcomes are ambiguous.
  if (result?.status === 429) return {state:attempts >= MAX_SEND_ATTEMPTS ? 'blocked' : 'retry', code:'rate_limited'};
  if (result?.status >= 400 && result.status < 500 && result.status !== 408) return {state:'blocked', code:'provider_rejected'};
  return {state:'uncertain', code:'outcome_unknown'};
}

async function sendOne(env, row, now) {
  const token = crypto.randomUUID();
  const claimed = await env.DB.prepare("UPDATE xtra_lead_email_outbox SET state='sending',attempts=attempts+1,lease_token=?,lease_until=?,updated_at=CURRENT_TIMESTAMP WHERE notification_id=? AND state IN ('pending','retry') AND attempts<? AND next_attempt_at<=?")
    .bind(token,now+LEASE_MS,row.notification_id,MAX_SEND_ATTEMPTS,now).run();
  if (!changed(claimed)) return false;
  const lead = await env.DB.prepare('SELECT name,phone,car_id,message FROM leads WHERE id=?').bind(row.lead_id).first();
  if (!lead) {
    await env.DB.prepare("UPDATE xtra_lead_email_outbox SET state='blocked',last_code='lead_missing',lease_token=NULL,lease_until=NULL WHERE notification_id=? AND lease_token=?").bind(row.notification_id,token).run();
    return false;
  }
  let result;
  try {
    result = await sendBrevoLeadNotification(env, {leadId:row.lead_id,source:row.source,...lead,carId:lead.car_id,notificationId:row.notification_id});
  } catch { result = {status:0}; }
  const outcome = emailOutcome(result, Number(row.attempts)+1);
  // Failure writing this receipt leaves 'sending'; expiry becomes uncertain, never a blind resend.
  await env.DB.prepare('UPDATE xtra_lead_email_outbox SET state=?,last_code=?,provider_message_id=?,next_attempt_at=?,lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE notification_id=? AND lease_token=?')
    .bind(outcome.state,outcome.code,result?.message_id || null,due(Number(row.attempts)+1,now),row.notification_id,token).run();
  return true;
}

async function reconcileOne(env, row, now) {
  const token = crypto.randomUUID();
  const claimed = await env.DB.prepare("UPDATE xtra_lead_email_outbox SET lease_token=?,lease_until=?,reconcile_attempts=reconcile_attempts+1 WHERE notification_id=? AND state IN ('uncertain','accepted') AND reconcile_attempts<? AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?)")
    .bind(token,now+LEASE_MS,row.notification_id,MAX_RECONCILE_ATTEMPTS,now,now).run();
  if (!changed(claimed)) return false;
  const evidence = await reconcileBrevoLeadNotification(env,row.notification_id,row.provider_message_id);
  const state = evidence?.state || row.state;
  await env.DB.prepare('UPDATE xtra_lead_email_outbox SET state=?,provider_message_id=COALESCE(?,provider_message_id),last_code=?,next_attempt_at=?,lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE notification_id=? AND lease_token=?')
    .bind(state,evidence?.message_id || null,evidence?.state ? 'provider_event' : 'reconciliation_pending',due(Number(row.reconcile_attempts)+1,now),row.notification_id,token).run();
  return true;
}

export async function processLeadEmailOutbox(env, {now=Date.now(), leadId=null}={}) {
  if (!env?.DB) return {ok:false,reason:'db_unavailable'};
  await env.DB.prepare("UPDATE xtra_lead_email_outbox SET state='uncertain',last_code='send_lease_expired',lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE state='sending' AND lease_until<=?").bind(now).run();
  const args = [now,leadId,leadId,BATCH_SIZE];
  const pending = await env.DB.prepare("SELECT * FROM xtra_lead_email_outbox WHERE state IN ('pending','retry') AND attempts<5 AND next_attempt_at<=? AND (? IS NULL OR lead_id=?) ORDER BY next_attempt_at,created_at LIMIT ?").bind(...args).all();
  let processed=0;
  for (const row of pending.results || []) processed += await sendOne(env,row,now) ? 1 : 0;
  const uncertain = await env.DB.prepare("SELECT * FROM xtra_lead_email_outbox WHERE state IN ('uncertain','accepted') AND reconcile_attempts<12 AND next_attempt_at<=? AND (? IS NULL OR lead_id=?) ORDER BY next_attempt_at,created_at LIMIT ?").bind(...args).all();
  let reconciled=0;
  for (const row of uncertain.results || []) reconciled += await reconcileOne(env,row,now) ? 1 : 0;
  return {ok:true,processed,reconciled};
}

// Read-only receipt inspection: no manual resend or state override endpoint.
export async function handleLeadEmailOutbox(request,env) {
  if (new URL(request.url).pathname !== '/api/admin/lead-email-outbox') return null;
  const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if (!(await verifyAdminToken(request,env)).ok) return reply({ok:false,error:'Unauthorized'},401);
  if (request.method !== 'GET') return reply({ok:false,error:'Method Not Allowed'},405);
  if (!env.DB) return reply({ok:false,error:'D1 unavailable'},503);
  const result=await env.DB.prepare('SELECT o.notification_id,o.lead_id,o.state,o.attempts,o.reconcile_attempts,o.provider_message_id,o.telegram_message_id,o.last_code,o.created_at,o.updated_at,i.delivery_ok AS telegram_delivery_ok FROM xtra_lead_email_outbox o LEFT JOIN xtra_lead_intake_requests i ON i.lead_id=o.lead_id ORDER BY o.created_at DESC LIMIT 100').all();
  return reply({ok:true,receipts:result.results || []});
}
