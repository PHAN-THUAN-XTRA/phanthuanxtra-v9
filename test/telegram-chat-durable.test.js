import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {enqueueAutoChat,processAutoChatJobs,handleAutoChatJobStatus} from '../src/telegram-chat-jobs.js';
import {handleTelegramRouter} from '../src/telegram-router.js';
import {issueAdminToken} from '../src/admin-auth.js';

function fixture(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(fs.readFileSync(new URL('../migrations/0042_telegram_chat_jobs.sql',import.meta.url),'utf8'));
 const db={prepare(query){let args=[];const s={bind(...values){args=values;return s;},
 async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};},
 async first(){return sql.prepare(query).get(...args)||null;},
 async all(){return {results:sql.prepare(query).all(...args)};}};return s;}};
 const env={DB:db,TELEGRAM_AUTO_BOT_TOKEN:'fixture',TELEGRAM_WEBHOOK_SECRET:'fixture',AI:{async run(){return {response:'Tư vấn xe theo nhu cầu, xác minh trên website.'};}}};
 return {env,sql,db,rows:()=>sql.prepare('SELECT * FROM xtra_telegram_chat_jobs').all()};
}
function req(id=7){return new Request('https://example.com/api/telegram/webhook',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':'fixture'},body:JSON.stringify({message:{message_id:id,chat:{id:123},text:'/chat Gợi ý xe gia đình?'}})});}

test('D1 row is committed before Telegram acknowledgement; duplicate webhook does not duplicate reply',async t=>{
 const f=fixture(),messages=[],tasks=[];
 t.mock.method(globalThis,'fetch',async(_url,init)=>{assert.equal(f.rows().length,1);messages.push(JSON.parse(init.body));return Response.json({ok:true,result:{message_id:messages.length}});});
 const ctx={waitUntil(p){tasks.push(p);}};
 assert.equal((await handleTelegramRouter(req(),f.env,ctx)).status,200);
 assert.equal((await handleTelegramRouter(req(),f.env,ctx)).status,200);
 await Promise.all(tasks);
 assert.equal(f.rows().length,1);assert.equal(messages.length,2);
 assert.equal(f.rows()[0].state,'sent');assert.equal(f.rows()[0].telegram_reply_id,2);
});
test('missing D1 returns HTTP 503 without acknowledgement',async t=>{
 let sends=0;t.mock.method(globalThis,'fetch',async()=>{sends++;return Response.json({ok:true});});
 const env={TELEGRAM_AUTO_BOT_TOKEN:'fixture',TELEGRAM_WEBHOOK_SECRET:'fixture'};
 assert.equal((await handleTelegramRouter(req(),env,{waitUntil(){throw Error('unexpected')}})).status,503);assert.equal(sends,0);
});
test('interrupted AI lease can recover persisted question and send one reply',async t=>{
 const f=fixture(),sends=[];
 const j=await enqueueAutoChat(f.env,{chatId:'123',messageId:9,question:'Cần tư vấn xe'});
 f.sql.exec("UPDATE xtra_telegram_chat_jobs SET state='generating',attempts=1,lease_until=10");
 t.mock.method(globalThis,'fetch',async(_url,init)=>{sends.push(JSON.parse(init.body));return Response.json({ok:true,result:{message_id:55}});});
 const result=await processAutoChatJobs(f.env,{now:1000,jobId:j.jobId});
 assert.equal(result.sent,1);assert.equal(sends.length,1);assert.equal(f.rows()[0].attempts,2);
 await processAutoChatJobs(f.env,{now:2000});assert.equal(sends.length,1);
});
test('exhausted AI lease yields a diagnostic instead of silent acknowledgement',async t=>{
 const f=fixture(),sends=[];
 await enqueueAutoChat(f.env,{chatId:'123',messageId:11,question:'Cần tư vấn xe'});
 f.sql.exec("UPDATE xtra_telegram_chat_jobs SET state='generating',attempts=3,lease_until=10");
 t.mock.method(globalThis,'fetch',async(_url,init)=>{sends.push(JSON.parse(init.body));return Response.json({ok:true,result:{message_id:67}});});
 await processAutoChatJobs(f.env,{now:1000});assert.match(sends[0].text,/AI_INTERRUPTED/);assert.equal(f.rows()[0].state,'sent');
});
test('expired Telegram send lease remains uncertain and is never resent',async t=>{
 const f=fixture();let sends=0;
 await enqueueAutoChat(f.env,{chatId:'123',messageId:12,question:'Cần tư vấn xe'});
 f.sql.exec("UPDATE xtra_telegram_chat_jobs SET state='sending',send_attempts=1,lease_until=10");
 t.mock.method(globalThis,'fetch',async()=>{sends++;return Response.json({ok:true});});
 await processAutoChatJobs(f.env,{now:1000});assert.equal(f.rows()[0].state,'uncertain');
 await processAutoChatJobs(f.env,{now:2000});assert.equal(sends,0);
});
test('signed admin reads metadata without leaking question, chat ID or reply',async()=>{
 const f=fixture();f.env.ADMIN_TOKEN='fixture';
 await enqueueAutoChat(f.env,{chatId:'987654321',messageId:14,question:'PRIVATE_CUSTOMER_QUESTION'});
 const url='https://example.com/api/admin/telegram-chat-jobs';
 assert.equal((await handleAutoChatJobStatus(new Request(url),f.env)).status,401);
 const token=await issueAdminToken(f.env);
 const h={authorization:'Bearer '+token};
 const res=await handleAutoChatJobStatus(new Request(url,{headers:h}),f.env);
 assert.equal(res.status,200);
 const body=await res.text();assert.ok(body.includes('source_message_id'));
 assert.ok(!body.includes('PRIVATE_CUSTOMER_QUESTION'));assert.ok(!body.includes('987654321'));
 assert.equal((await handleAutoChatJobStatus(new Request(url,{method:'POST',headers:h}),f.env)).status,405);
});
test('D1 write error does not acknowledge an uncommitted question',async t=>{
 const f=fixture();let sends=0;
 f.sql.exec("CREATE TRIGGER reject_chat BEFORE INSERT ON xtra_telegram_chat_jobs BEGIN SELECT RAISE(ABORT,'fixture'); END;");
 t.mock.method(console,'warn',()=>{});t.mock.method(globalThis,'fetch',async()=>{sends++;return Response.json({ok:true});});
 assert.equal((await handleTelegramRouter(req(),f.env,{waitUntil(){}})).status,503);assert.equal(sends,0);
});

test('Cloudflare Telegram outbound send uses manual redirect and never follows untrusted origin',async t=>{
 const f=fixture(),transport=[];
 await enqueueAutoChat(f.env,{chatId:'123',messageId:77,question:'Cần tư vấn dòng xe'});
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  transport.push({url,redirect:init.redirect,body:JSON.parse(init.body)});
  assert.equal(init.redirect,'manual','Cloudflare may fail before contacting Telegram with redirect:error');
  return Response.json({ok:true,result:{message_id:555}},{status:200});
 });
 const outcome=await processAutoChatJobs(f.env,{now:Date.now()});
 assert.equal(outcome.sent,1);assert.equal(transport.length,1);assert.equal(f.rows()[0].state,'sent');
 assert.equal(f.rows()[0].telegram_reply_id,555);
});
test('HTTP redirect from Telegram is never followed or accepted and never blind retried',async t=>{
 const f=fixture(),seen=[];
 await enqueueAutoChat(f.env,{chatId:'123',messageId:78,question:'Cần tư vấn xe'});
 t.mock.method(globalThis,'fetch',async(url,init)=>{
   assert.equal(init.redirect,'manual');seen.push(url);
   return new Response(null,{status:302,headers:{location:'https://attacker.example/steal'}});
 });
 await processAutoChatJobs(f.env,{now:Date.now()});
 assert.equal(seen.length,1);assert.equal(f.rows()[0].state,'uncertain');
 await processAutoChatJobs(f.env,{now:Date.now()+100000});
 assert.equal(seen.length,1);
});
