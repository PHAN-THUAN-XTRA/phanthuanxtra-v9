import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verifyOwnerChat } from './backup-telegram-delivery.mjs';

const REPO = 'PHAN-THUAN-XTRA/phanthuanxtra-v9';
const DEPLOY = 'Deploy Cloudflare Worker';
const GATES = ['Production Smoke Gate-15', 'Production Asset Delivery Gate', 'Stage 3 Production Reconciliation'];
const localDate = now => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);

export function workflowNotice(event, env) {
  const r = event.workflow_run;
  if (env.GITHUB_REPOSITORY !== REPO || !r || r.repository?.full_name !== REPO ||
      r.head_repository?.full_name !== REPO || r.head_branch !== 'main' || r.status !== 'completed') return null;
  if (r.name === DEPLOY ? !['push','workflow_dispatch'].includes(r.event) :
      !GATES.includes(r.name) || r.event !== 'workflow_run') return null;
  if (!['success','failure','cancelled','timed_out','action_required','startup_failure'].includes(r.conclusion)) return null;
  if (r.name !== DEPLOY && r.conclusion === 'success') return null;
  if (!Number.isSafeInteger(r.id) || !/^[a-f0-9]{40}$/.test(r.head_sha)) throw Error('Invalid workflow identity');
  const status = r.conclusion === 'success' ? 'DEPLOY THÀNH CÔNG (các gate hậu kiểm chạy riêng)' : 'CẦN KIỂM TRA: '+r.conclusion;
  return {key:'workflow-'+r.id+'-'+(r.run_attempt || 1), source_sha:r.head_sha,
    text:'PHAN THUẦN XTRA · TRIỂN KHAI\n'+status+'\n'+r.name+'\nCommit: '+r.head_sha+'\nhttps://github.com/'+REPO+'/actions/runs/'+r.id};
}

export async function checkPublicSite(request=fetch) {
  const checks = [];
  for (const path of ['/', '/api/health', '/api/cars']) {
    let ok = false, status = 0;
    for (let attempt=0; attempt<2 && !ok; attempt++) {
      try {
        const r = await request('https://phanthuanxtra.com'+path, {redirect:'error',signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
        status = r.status;
        if (r.status !== 200) { await r.body?.cancel(); continue; }
        if (path === '/') ok = /text\/html/i.test(r.headers.get('content-type') || '') && (await r.text()).includes('PHAN THUẦN XTRA');
        else {
          const d = await r.json();
          ok = path === '/api/health' ? d.ok === true : d.source === 'd1' && Array.isArray(d.cars);
        }
      } catch { status = 0; }
    }
    checks.push({path,ok,status});
  }
  return {ok:checks.every(c=>c.ok),checks};
}

export function healthNotice(health, env, now=new Date()) {
  if (env.GITHUB_EVENT_NAME === 'schedule' && health.ok) return null;
  return {key:health.ok ? 'activation-'+env.GITHUB_SHA : 'site-failure-'+localDate(now), source_sha:env.GITHUB_SHA,
    text:'PHAN THUẦN XTRA · GIÁM SÁT WEBSITE\n'+(health.ok ? 'Đã bật giám sát mỗi giờ. Kiểm tra hiện tại: PASS.' : 'CẢNH BÁO: kiểm tra website thất bại sau 2 lần thử.')+
      '\n'+health.checks.map(c=>c.path+': '+(c.ok?'PASS':'FAIL')+' (HTTP '+c.status+')').join('\n')+
      '\nCảnh báo website tối đa 1 lần/ngày UTC+7; chi tiết mỗi lần kiểm tra nằm trong Actions.'+
      '\nhttps://github.com/'+REPO+'/actions/runs/'+env.GITHUB_RUN_ID};
}

export async function sendOwnerNotice(notice, env, request=fetch) {
  if (!notice) return {skipped:true,reason:'no notification needed'};
  if (env.GITHUB_REPOSITORY !== REPO || !env.GITHUB_TOKEN || !env.TELEGRAM_BACKUP_BOT_TOKEN || !env.TELEGRAM_BACKUP_CHAT_ID) throw Error('Alert credentials unavailable');
  if (Number(env.GITHUB_RUN_ATTEMPT || 1) !== 1) throw Error('Reconcile receipts before rerun; automatic resend disabled');
  if (!/^[a-z0-9-]{1,100}$/.test(notice.key) || notice.text.length>3800) throw Error('Invalid notice');
  const artifact_name = 'owner-alert-'+notice.key;
  const inventory = await request('https://api.github.com/repos/'+REPO+'/actions/artifacts?name='+encodeURIComponent(artifact_name), {
    headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
  if (!inventory.ok) throw Error('Cannot reconcile alert receipts');
  const data = await inventory.json();
  if (!Array.isArray(data.artifacts)) throw Error('Invalid receipt inventory');
  if (data.artifacts.some(a=>a.name===artifact_name && !a.expired)) return {skipped:true,reason:'receipt exists'};
  async function api(method, fields) {
    // No retries: a timeout after send may still mean Telegram accepted it.
    let r;
    try { r = await request('https://api.telegram.org/bot'+env.TELEGRAM_BACKUP_BOT_TOKEN+'/'+method, {
      method:'POST',body:new URLSearchParams(fields),signal:AbortSignal.timeout(30000)}); }
    catch { throw Error('Telegram '+method+' outcome unknown; reconcile before retry'); }
    const d = await r.json().catch(()=>null);
    if (!r.ok || d?.ok!==true) throw Error('Telegram '+method+' failed (HTTP '+r.status+')');
    return d.result;
  }
  const owner = '6451516147', chat_id = env.TELEGRAM_BACKUP_CHAT_ID;
  verifyOwnerChat(await api('getChat',{chat_id}),owner);
  const sent = await api('sendMessage',{chat_id,text:notice.text,disable_web_page_preview:'true'});
  verifyOwnerChat(sent.chat,owner);
  if (!Number.isSafeInteger(sent.message_id)) throw Error('Missing Telegram acknowledgment');
  return {artifact_name,source_sha:notice.source_sha,run_id:env.GITHUB_RUN_ID,owner_verified:true,message_id:sent.message_id};
}

async function main() {
  const env=process.env;
  if (env.GITHUB_REPOSITORY !== REPO || env.GITHUB_REF !== 'refs/heads/main') throw Error('Only protected main may send alerts');
  let health, notice;
  if (env.GITHUB_EVENT_NAME === 'workflow_run') notice=workflowNotice(JSON.parse(await readFile(env.GITHUB_EVENT_PATH,'utf8')),env);
  else if (['push','schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)) {
    health=await checkPublicSite();
    await writeFile('production-health.json',JSON.stringify(health,null,2));
    console.log(JSON.stringify(health));
    notice=healthNotice(health,env);
  } else throw Error('Unsupported alert event');
  const receipt=await sendOwnerNotice(notice,env);
  if (!receipt.skipped) {
    await writeFile('production-alert-receipt.json',JSON.stringify(receipt,null,2));
    if(env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT,'artifact_name='+receipt.artifact_name+'\n');
  }
  console.log(receipt.skipped ? 'Notification skipped: '+receipt.reason : 'Verified private owner delivery acknowledged');
  if (health && !health.ok) process.exitCode=1;
}
if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
