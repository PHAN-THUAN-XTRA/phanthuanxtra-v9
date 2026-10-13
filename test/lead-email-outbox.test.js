import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {storeLeadWithEmailIntent,processLeadEmailOutbox,emailOutcome,handleLeadEmailOutbox} from '../src/lead-email-outbox.js';
import {issueAdminToken} from '../src/admin-auth.js';
import {reconcileBrevoLeadNotification} from '../src/business-integrations.js';

function database() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE leads(id INTEGER PRIMARY KEY,name TEXT,phone TEXT,car_id TEXT,message TEXT);
    CREATE TABLE xtra_lead_intake_requests(idempotency_key TEXT PRIMARY KEY,lead_id INTEGER,customer_id TEXT,source TEXT,payload_fingerprint TEXT,status TEXT,delivery_ok INTEGER DEFAULT 0,updated_at TEXT);`);
  sqlite.exec(fs.readFileSync(new URL('../migrations/0041_lead_email_outbox.sql',import.meta.url),'utf8'));
  const db={
    prepare(sql){let args=[]; const s={bind(...values){args=values;return s;},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};},async first(){return sqlite.prepare(sql).get(...args) || null;},async all(){return {results:sqlite.prepare(sql).all(...args)};}};return s;},
    async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}
  };
  return {db,sqlite};
}
async function fixture() {
  const {db,sqlite}=database();
  const leadId=await storeLeadWithEmailIntent(db,{key:'fixture',fingerprint:'fixture',source:'website-lead',name:'Synthetic',phone:'0900000000',carId:'',message:'fixture'});
  const env={DB:db,BREVO_API_KEY:'fixture',BREVO_SENDER_EMAIL:'sender@example.com',BREVO_TO_EMAIL:'owner@example.com'};
  return {db,sqlite,leadId,env,row:()=>sqlite.prepare('SELECT * FROM xtra_lead_email_outbox').get()};
}

test('lead, receipt and unique email intent commit atomically; migration never backfills',async()=>{
 const f=await fixture();assert.equal(f.row().lead_id,f.leadId);assert.equal(f.row().state,'pending');
 assert.equal(f.sqlite.prepare('SELECT lead_id FROM xtra_lead_intake_requests').get().lead_id,f.leadId);
 f.sqlite.exec(fs.readFileSync(new URL('../migrations/0041_lead_email_outbox.sql',import.meta.url),'utf8'));
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM xtra_lead_email_outbox').get().n,1);
 f.sqlite.exec("CREATE TRIGGER reject_intent BEFORE INSERT ON xtra_lead_email_outbox BEGIN SELECT RAISE(ABORT,'fixture'); END;");
 await assert.rejects(storeLeadWithEmailIntent(f.db,{key:'failure',source:'website-lead',fingerprint:'fixture',name:'Synthetic',phone:'0900000000',carId:'',message:'fixture'}));
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM leads').get().n,1);
 assert.equal(f.sqlite.prepare("SELECT lead_id FROM xtra_lead_intake_requests WHERE idempotency_key='failure'").get(),undefined);
});
test('concurrent workers send one alert and retain provider receipt',async()=>{
 const f=await fixture();const old=globalThis.fetch;let sends=0;
 globalThis.fetch=async(_url,options)=>{sends++;const body=JSON.parse(options.body);assert.ok(body.tags.includes(f.row().notification_id));return Response.json({messageId:'<fixture@example.com>'},{status:201});};
 try{await Promise.all([processLeadEmailOutbox(f.env),processLeadEmailOutbox(f.env)]);assert.equal(sends,1);assert.equal(f.row().state,'accepted');assert.equal(f.row().provider_message_id,'<fixture@example.com>');await processLeadEmailOutbox(f.env);assert.equal(sends,1);}finally{globalThis.fetch=old;}
});
test('timeout and expired send lease never resend; matching provider event reconciles',async()=>{
 const f=await fixture();const old=globalThis.fetch;let sends=0;
 globalThis.fetch=async()=>{sends++;throw new Error('timeout');};
 try{
  await processLeadEmailOutbox(f.env,{now:1000});assert.equal(f.row().state,'uncertain');assert.equal(sends,1);
  globalThis.fetch=async(url,options)=>{assert.equal(options.method,undefined);assert.ok(new URL(url).searchParams.get('tags').includes(f.row().notification_id));return Response.json({events:[{tag:f.row().notification_id,email:'owner@example.com',event:'delivered',messageId:'<fixture@example.com>'}]});};
  await processLeadEmailOutbox(f.env,{now:200000});assert.equal(f.row().state,'delivered');assert.equal(sends,1);
  f.sqlite.exec("UPDATE xtra_lead_email_outbox SET state='sending',lease_until=1,next_attempt_at=0,provider_message_id=NULL");
  globalThis.fetch=async()=>Response.json({events:[]});
  await processLeadEmailOutbox(f.env,{now:300000});assert.equal(f.row().state,'uncertain');
 }finally{globalThis.fetch=old;}
});
test('lost provider receipt write cannot create a duplicate send',async()=>{
 const f=await fixture();const old=globalThis.fetch;let sends=0;
 f.sqlite.exec("CREATE TRIGGER reject_receipt BEFORE UPDATE ON xtra_lead_email_outbox WHEN NEW.state='accepted' BEGIN SELECT RAISE(ABORT,'fixture'); END;");
 globalThis.fetch=async()=>{sends++;return Response.json({messageId:'<fixture@example.com>'},{status:201});};
 try{await assert.rejects(processLeadEmailOutbox(f.env,{now:1000}));assert.equal(f.row().state,'sending');f.sqlite.exec('DROP TRIGGER reject_receipt');globalThis.fetch=async()=>Response.json({events:[]});await processLeadEmailOutbox(f.env,{now:200000});assert.equal(f.row().state,'uncertain');assert.equal(sends,1);}finally{globalThis.fetch=old;}
});
test('explicit rejection retries are bounded and ambiguous outcomes are held',()=>{
 assert.equal(emailOutcome({status:429},1).state,'retry');assert.equal(emailOutcome({status:429},5).state,'blocked');
 for(const status of [0,408,500,502,503])assert.equal(emailOutcome({status},1).state,'uncertain');
 assert.equal(emailOutcome({status:401},1).state,'blocked');
});
test('provider evidence requires exact tag, recipient and message ID; redirects stay manual',async()=>{
 const f=await fixture();const old=globalThis.fetch;
 try{for(const mismatch of [{tag:'wrong'},{email:'other@example.com'},{messageId:'<wrong@example.com>'}]){
 globalThis.fetch=async(_url,options)=>{assert.equal(options.redirect,'manual');return Response.json({events:[{tag:f.row().notification_id,email:'owner@example.com',messageId:'<fixture@example.com>',event:'delivered',...mismatch}]});};
 assert.equal(await reconcileBrevoLeadNotification(f.env,f.row().notification_id,'<fixture@example.com>'),null);
 }}finally{globalThis.fetch=old;}
});
test('outbox receipts require signed admin authentication and omit customer content',async()=>{
 const f=await fixture();f.env.ADMIN_TOKEN='fixture';
 const url='https://example.com/api/admin/lead-email-outbox';
 assert.equal((await handleLeadEmailOutbox(new Request(url),f.env)).status,401);
 const token=await issueAdminToken(f.env);const headers={authorization:`Bearer ${token}`};
 assert.equal((await handleLeadEmailOutbox(new Request(url,{method:'POST',headers}),f.env)).status,405);
 const r=await handleLeadEmailOutbox(new Request(url,{headers}),f.env);assert.equal(r.status,200);const body=await r.text();assert.ok(body.includes('telegram_delivery_ok'));assert.ok(!body.includes('0900000000'));assert.ok(!body.includes('Synthetic'));
});

test('duplicate intake rolls back without duplicate lead or notification',async()=>{
 const f=await fixture();
 await assert.rejects(storeLeadWithEmailIntent(f.db,{key:'fixture',fingerprint:'fixture',source:'website-lead',name:'Synthetic',phone:'0900000000',carId:'',message:'fixture'}));
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM leads').get().n,1);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM xtra_lead_email_outbox').get().n,1);
});
test('429 retries stop at five and pending work survives process restart',async()=>{
 const f=await fixture();const old=globalThis.fetch;let sends=0;
 globalThis.fetch=async()=>{sends++;return Response.json({code:'too_many_requests'},{status:429});};
 try{for(let i=0;i<6;i++)await processLeadEmailOutbox(f.env,{now:i*4000000});assert.equal(sends,5);assert.equal(f.row().state,'blocked');assert.equal(f.row().attempts,5);}finally{globalThis.fetch=old;}
});
