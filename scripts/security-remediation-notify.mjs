import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {verifyOwnerChat} from "./backup-telegram-delivery.mjs";

const clean=(v,n=1200)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);

async function api(token,method,fields){
  const r=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",body:new URLSearchParams(fields),signal:AbortSignal.timeout(30000)});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.ok!==true)throw new Error("Telegram "+method+" failed HTTP "+r.status);
  return d.result;
}

export async function notifyRemediation(env=process.env){
  const token=env.TELEGRAM_BACKUP_BOT_TOKEN,chat=env.TELEGRAM_BACKUP_CHAT_ID,owner=env.TELEGRAM_BACKUP_OWNER_ID;
  if(!token||!chat||!owner)throw new Error("Owner Telegram configuration missing");
  const investigation=JSON.parse(await readFile(env.INCIDENT_INVESTIGATION_REPORT||"incident-investigation.json","utf8"));
  const prUrl=clean(env.REMEDIATION_PR_URL,500);
  const status=clean(env.REMEDIATION_STATUS||"report-only",80);
  verifyOwnerChat(await api(token,"getChat",{chat_id:chat}),owner);
  let text="🛡️ PHAN THUẦN XTRA · INCIDENT INVESTIGATOR\n"+
    "Incident: "+investigation.incident_id+"\n"+
    "Mức độ: "+String(investigation.highest_severity||"unknown").toUpperCase()+"\n"+
    "Xử lý tự động: "+status+"\n";
  if(prUrl)text+="Draft PR: "+prUrl+"\n";
  const phase3=investigation?.phase3;
  if(phase3?.mitigation_proposal){
    const ev=phase3.evidence||{};
    text+="\nPhase 3 Security proposal:\n"+
      "- Confidence: "+String(phase3.confidence||"unknown")+"\n"+
      "- WAF events: "+String(ev.waf_events??"n/a")+"\n"+
      "- Top path: "+String(ev.top_path||"n/a")+"\n"+
      "- Top country/source: "+String(ev.top_country||"n/a")+" / "+String(ev.top_source||"n/a")+"\n"+
      "- Proposed action: "+String(phase3.mitigation_proposal.preferred_action||"review")+"\n"+
      "- APPLY: false · Owner approval required\n";
  }
  text+="\nAgent không tự merge, không rollback production, không sửa WAF/firewall và không phát sinh paid-AI.";
  const sent=await api(token,"sendMessage",{chat_id:chat,text:text.slice(0,3900),disable_web_page_preview:"true"});
  verifyOwnerChat(sent.chat,owner);
  return {message_id:sent.message_id,incident_id:investigation.incident_id,status,pr_url:prUrl||null};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  console.log(JSON.stringify(await notifyRemediation()));
}
