import test from "node:test";
import assert from "node:assert/strict";
import { handleTelegramIngest } from "../src/telegram-ingest.js";

test("Telegram visibility command emits safe dispatch diagnostics after webhook authentication and before chat authorization", async () => {
  const lines=[];
  const original=console.log;
  console.log=(...args)=>lines.push(args.join(" "));
  try{
    const request=new Request("https://phanthuanxtra.com/api/telegram/webhook",{
      method:"POST",
      headers:{"content-type":"application/json","X-Telegram-Bot-Api-Secret-Token":"fixture"},
      body:JSON.stringify({update_id:101,message:{message_id:202,chat:{id:303},text:"/show tg-652"}})
    });
    const env={DB:{},TELEGRAM_WEBHOOK_SECRET:"fixture"};
    await handleTelegramIngest(request,env,{});
  } catch(error) {
    assert.match(String(error),/prepare|canPublish|DB/i);
  } finally {
    console.log=original;
  }
  const joined=lines.join("\n");
  assert.match(joined,/telegram_webhook_dispatch/);
  assert.match(joined,/telegram_visibility_command/);
  assert.match(joined,/"car_id":"tg-652"/);
  assert.doesNotMatch(joined,/TELEGRAM_BOT_TOKEN|Authorization|secret_token/i);
});

test("Telegram webhook status source exposes the actual configured URL field", async () => {
  const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../src/telegram-ingest.js",import.meta.url),"utf8"));
  assert.match(source,/url:actual\|\|null/);
});
