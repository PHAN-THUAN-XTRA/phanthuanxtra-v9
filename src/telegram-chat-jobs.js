import {answerAutoCustomer,autoChatFailure} from "./auto-bot-ai.js";
import {verifyAdminToken} from "./admin-auth.js";
const LIMIT=3,LEASE_MS=90000;
const changed=r=>Number(r?.meta?.changes||0)===1;
const interrupted="AI đã bị gián đoạn nhiều lần. Mã: AI_INTERRUPTED. Vui lòng thử lại sau.";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
// Persist before acknowledging. Unique update ID makes Telegram webhook retries idempotent.
export async function enqueueAutoChat(env,{chatId,messageId,question}){
 if(!env?.DB)throw Error("CHAT_D1_UNAVAILABLE");
 if(!chatId||!Number.isSafeInteger(Number(messageId))||Number(messageId)<1)throw Error("INVALID_CHAT_UPDATE");
 const id=crypto.randomUUID();
 const result=await env.DB.prepare("INSERT INTO xtra_telegram_chat_jobs (job_id,chat_id,source_message_id,question) VALUES (?,?,?,?) ON CONFLICT(chat_id,source_message_id) DO NOTHING").bind(id,String(chatId),Number(messageId),String(question||"").trim().slice(0,2000)).run();
 if(changed(result))return {jobId:id,inserted:true};
 const row=await env.DB.prepare("SELECT job_id FROM xtra_telegram_chat_jobs WHERE chat_id=? AND source_message_id=?").bind(String(chatId),Number(messageId)).first();
 if(!row?.job_id)throw Error("CHAT_RECEIPT_MISSING");
 return {jobId:row.job_id,inserted:false};
}
async function generateOne(env,row,now){
 const token=crypto.randomUUID();
 const claim=await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state='generating',attempts=attempts+1,lease_token=?,lease_until=?,updated_at=CURRENT_TIMESTAMP WHERE job_id=? AND state='pending' AND attempts<3 AND next_attempt_at<=?").bind(token,now+LEASE_MS,row.job_id,now).run();
 if(!changed(claim))return false;
 let answer,code=null;
 try{answer=(await answerAutoCustomer(env,row.question,{modelTimeoutMs:6500})).answer;}
 catch(error){const failure=autoChatFailure(error);code=failure?.code||"AI_UNAVAILABLE";answer=failure?.message||"AI chưa trả lời được. Mã: AI_UNAVAILABLE. Vui lòng thử lại sau.";}
 await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state='ready',answer=?,error_code=?,lease_token=NULL,lease_until=NULL,next_attempt_at=0,updated_at=CURRENT_TIMESTAMP WHERE job_id=? AND state='generating' AND lease_token=?").bind(String(answer).slice(0,3600),code,row.job_id,token).run();
 return true;
}
async function sendOne(env,row,now){
 const token=crypto.randomUUID();
 const claimed=await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state='sending',send_attempts=send_attempts+1,lease_token=?,lease_until=?,updated_at=CURRENT_TIMESTAMP WHERE job_id=? AND state='ready' AND next_attempt_at<=? AND send_attempts<3").bind(token,now+LEASE_MS,row.job_id,now).run();
 if(!changed(claimed))return false;
 const botToken=env.TELEGRAM_AUTO_BOT_TOKEN||env.TELEGRAM_BOT_TOKEN;
 if(!botToken){
  await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state='blocked',error_code='BOT_NOT_CONFIGURED',lease_token=NULL,lease_until=NULL WHERE job_id=? AND lease_token=?").bind(row.job_id,token).run();
  return false;
 }
 try{
  const response=await fetch("https://api.telegram.org/bot"+botToken+"/sendMessage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:row.chat_id,reply_to_message_id:row.source_message_id,text:row.answer}),redirect:"manual",signal:AbortSignal.timeout(8000)});
  const data=await response.json().catch(()=>({}));
  if(response.status===429&&data.ok===false){
   await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state=CASE WHEN send_attempts>=3 THEN 'blocked' ELSE 'ready' END,error_code='TELEGRAM_RATE_LIMITED',next_attempt_at=?,lease_token=NULL,lease_until=NULL WHERE job_id=? AND lease_token=?").bind(now+60000,row.job_id,token).run();return false;
  }
  if(!response.ok||data.ok!==true||!Number.isSafeInteger(data.result?.message_id)){
   const rejected=response.status>=400&&response.status<500&&response.status!==408;
   await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state=?,error_code=?,lease_token=NULL,lease_until=NULL WHERE job_id=? AND lease_token=?").bind(rejected?"blocked":"uncertain",rejected?"TELEGRAM_REJECTED":"TELEGRAM_SEND_UNCERTAIN",row.job_id,token).run();return false;
  }
  await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state='sent',telegram_reply_id=?,error_code=NULL,lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE job_id=? AND state='sending' AND lease_token=?").bind(data.result.message_id,row.job_id,token).run();return true;
 }catch{
  // Telegram might have accepted the message before timeout: never retry blindly.
  await env.DB.prepare("UPDATE xtra_telegram_chat_jobs SET state='uncertain',error_code='TELEGRAM_SEND_UNCERTAIN',lease_token=NULL,lease_until=NULL WHERE job_id=? AND state='sending' AND lease_token=?").bind(row.job_id,token).run().catch(()=>{});return false;
 }
}
export async function processAutoChatJobs(env,{now=Date.now(),jobId=null,limit=2}={}){
 if(!env?.DB)return {ok:false,reason:"D1_UNAVAILABLE"};
 const db=env.DB;
 await db.prepare("UPDATE xtra_telegram_chat_jobs SET state='pending',lease_token=NULL,lease_until=NULL,next_attempt_at=0,error_code='AI_INTERRUPTED' WHERE state='generating' AND lease_until<=? AND attempts<3").bind(now).run();
 await db.prepare("UPDATE xtra_telegram_chat_jobs SET state='ready',answer=?,error_code='AI_INTERRUPTED',lease_token=NULL,lease_until=NULL,next_attempt_at=0 WHERE state='generating' AND lease_until<=? AND attempts>=3").bind(interrupted,now).run();
 await db.prepare("UPDATE xtra_telegram_chat_jobs SET state='uncertain',error_code='TELEGRAM_SEND_UNCERTAIN',lease_token=NULL,lease_until=NULL WHERE state='sending' AND lease_until<=?").bind(now).run();
 const select=async state=>db.prepare("SELECT * FROM xtra_telegram_chat_jobs WHERE state=? AND next_attempt_at<=? AND (? IS NULL OR job_id=?) ORDER BY created_at LIMIT ?").bind(state,now,jobId,jobId,Math.max(1,Math.min(3,limit))).all();
 let generated=0,sent=0;
 for(const row of (await select("pending")).results||[])if(await generateOne(env,row,now))generated++;
 for(const row of (await select("ready")).results||[])if(await sendOne(env,row,now))sent++;
 if(!jobId)await db.prepare("DELETE FROM xtra_telegram_chat_jobs WHERE state='sent' AND created_at<datetime('now','-7 days')").run();
 return {ok:true,generated,sent};
}
// Authenticated operational metadata only. Do not expose customer chat IDs, questions or answers.
export async function handleAutoChatJobStatus(request,env){
 if(new URL(request.url).pathname!=="/api/admin/telegram-chat-jobs")return null;
 if(!(await verifyAdminToken(request,env)).ok)return json({ok:false,error:"Unauthorized"},401);
 if(request.method!=="GET")return json({ok:false,error:"Method Not Allowed"},405);
 if(!env.DB)return json({ok:false,error:"D1 unavailable"},503);
 const rows=await env.DB.prepare("SELECT job_id,source_message_id,state,attempts,send_attempts,error_code,telegram_reply_id,created_at,updated_at FROM xtra_telegram_chat_jobs ORDER BY created_at DESC LIMIT 40").all();
 return json({ok:true,jobs:rows.results||[]});
}
