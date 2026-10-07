import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source=await readFile(new URL("../scripts/register-vip-telegram-webhook.mjs",import.meta.url),"utf8");

async function run(env,fetchImpl){
  const logs=[];
  const context={
    process:{env},
    fetch:fetchImpl,
    AbortSignal,
    console:{log:v=>logs.push(String(v))},
    setTimeout,
    clearTimeout,
    URL,
  };
  const wrapped=`(async()=>{\n${source}\n})()`;
  await vm.runInNewContext(wrapped,context,{filename:"register-vip-telegram-webhook.mjs"});
  return logs;
}

test("VIP registration uses secret_token, preserves pending updates, verifies URL and authenticated smoke",async()=>{
  const token="vip_"+crypto.randomUUID().replaceAll("-","_");
  const secret="sec_"+crypto.randomUUID().replaceAll("-","_");
  const expected="https://phanthuanxtra.com/api/telegram/vip-webhook";
  const calls=[];
  const logs=await run({
    TELEGRAM_VIP_BOT_TOKEN:token,
    TELEGRAM_VIP_WEBHOOK_SECRET:secret,
  },async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).endsWith("/setWebhook")) return new Response(JSON.stringify({ok:true,result:true}),{status:200,headers:{"content-type":"application/json"}});
    if(String(url).endsWith("/getWebhookInfo")) return new Response(JSON.stringify({ok:true,result:{url:expected,pending_update_count:2}}),{status:200,headers:{"content-type":"application/json"}});
    assert.equal(String(url),expected);
    assert.equal(options.headers["X-Telegram-Bot-Api-Secret-Token"],secret);
    assert.equal(options.body,"{}");
    return new Response(JSON.stringify({ok:true,ignored:true}),{status:200,headers:{"content-type":"application/json"}});
  });
  assert.equal(calls.length,3);
  const registration=JSON.parse(calls[0].options.body);
  assert.equal(registration.url,expected);
  assert.equal(registration.secret_token,secret);
  assert.equal(registration.drop_pending_updates,false);
  assert.deepEqual(registration.allowed_updates,["message","channel_post"]);
  assert.equal(logs.length,1);
  assert.equal(logs[0].includes(secret),false);
  assert.equal(logs[0].includes(token),false);
  const report=JSON.parse(logs[0]);
  assert.equal(report.ok,true);
  assert.equal(report.authenticated_smoke_status,200);
});

test("VIP registration refuses missing or invalid secret before network calls",async()=>{
  let called=false;
  await assert.rejects(()=>run({TELEGRAM_VIP_BOT_TOKEN:"fake-token",TELEGRAM_VIP_WEBHOOK_SECRET:"bad secret"},async()=>{called=true;}),/absent or invalid/);
  assert.equal(called,false);
});
