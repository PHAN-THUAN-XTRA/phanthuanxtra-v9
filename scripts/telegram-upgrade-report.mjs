import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { verifyOwnerChat } from './backup-telegram-delivery.mjs';
export function renderReport(r) {
  const keys=['schema','id','date','kind','summary','proposals'];
  if (!r || Object.keys(r).some(k=>!keys.includes(k)) || r.schema!==1 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.date||'') ||
      !new RegExp('^'+r.date+'-(research|activation)$').test(r.id||'') ||
      !['research','activation'].includes(r.kind) || r.id!==r.date+'-'+r.kind ||
      !Array.isArray(r.proposals) || r.proposals.length>3) throw Error('Invalid report envelope');
  const bounded=(s,n)=>{if(typeof s!=='string'||!s.trim()||s.length>n)throw Error('Invalid report text');return s;};
  let text='PHAN THUẦN XTRA · ĐỀ XUẤT NÂNG CẤP\n'+r.date+'\n\n'+bounded(r.summary,400);
  for(const [i,p] of r.proposals.entries()) {
    if(Object.keys(p).some(k=>!['title','benefit','cost','risk','next_step','sources'].includes(k)) ||
       !Array.isArray(p.sources)||p.sources.length<1||p.sources.length>2)throw Error('Invalid proposal');
    const urls=p.sources.map(s=>{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||s.length>250)throw Error('Invalid source');return s;});
    text+='\n\n'+(i+1)+'. '+bounded(p.title,120)+'\nLợi ích: '+bounded(p.benefit,220)+'\nChi phí: '+bounded(p.cost,160)+'\nRủi ro: '+bounded(p.risk,160)+'\nBước thử: '+bounded(p.next_step,200)+'\nNguồn: '+urls.join('\n');
  }
  text+='\n\nChỉ nghiên cứu/đề xuất. Nâng cấp production, trả phí và publish cần quyết định riêng của owner.';
  if(text.length>3800)throw Error('Report exceeds Telegram text budget');
  return text;
}
export async function deliverReport(r, env, request=fetch) {
  const text=renderReport(r), token=env.TELEGRAM_BACKUP_BOT_TOKEN, chat=env.TELEGRAM_BACKUP_CHAT_ID;
  const owner=env.TELEGRAM_BACKUP_OWNER_ID;
  if(!token||!chat||!owner)throw Error('Owner Telegram configuration missing');
  if(env.GITHUB_RUN_ATTEMPT && Number(env.GITHUB_RUN_ATTEMPT)>1)throw Error('Rerun requires receipt reconciliation; no automatic resend');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(env.GITHUB_ACTIONS==='true'&&r.date!==today)throw Error('Only current local-day reports may be delivered');
  const artifactName='upgrade-delivery-'+r.id;
  if(env.GITHUB_TOKEN&&env.GITHUB_REPOSITORY) {
    const response=await request('https://api.github.com/repos/'+env.GITHUB_REPOSITORY+'/actions/artifacts?name='+encodeURIComponent(artifactName),{headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Cannot reconcile existing delivery receipts');
    const data=await response.json();
    if(!Array.isArray(data.artifacts))throw Error('Invalid receipt inventory');
    if(data.artifacts.some(a=>a.name===artifactName&&!a.expired))return {report_id:r.id,skipped:true,reason:'delivery receipt exists'};
  }
  async function api(method,fields) {
    const response=await request('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',body:new URLSearchParams(fields),signal:AbortSignal.timeout(30000)});
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.ok!==true)throw Error('Telegram '+method+' failed (HTTP '+response.status+')');
    return data.result;
  }
  verifyOwnerChat(await api('getChat',{chat_id:chat}),owner);
  const result=await api('sendMessage',{chat_id:chat,text,disable_web_page_preview:'true'});
  verifyOwnerChat(result.chat,owner);
  if(!Number.isSafeInteger(result.message_id))throw Error('Missing Telegram delivery receipt');
  return {report_id:r.id,source_sha:env.GITHUB_SHA,run_id:env.GITHUB_RUN_ID,owner_verified:true,message_id:result.message_id};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]) {
  const r=JSON.parse(await readFile('research/upgrade-report.json','utf8'));
  const receipt=await deliverReport(r,process.env);
  await writeFile('upgrade-delivery-receipt.json',JSON.stringify(receipt,null,2));
  if(process.env.GITHUB_OUTPUT) {
    const {appendFile}=await import('node:fs/promises');
    await appendFile(process.env.GITHUB_OUTPUT,'artifact_name=upgrade-delivery-'+r.id+'\n');
  }
  console.log(receipt.skipped?'Existing upgrade delivery receipt found; skipped':'Telegram owner upgrade report delivery: PASS');
}
