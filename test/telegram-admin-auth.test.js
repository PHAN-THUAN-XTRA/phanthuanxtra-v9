import test from "node:test";
import assert from "node:assert/strict";
import { issueAdminToken } from "../src/admin-auth.js";
import { handleTelegramIngest } from "../src/telegram-ingest.js";

function env(){
  return {
    ADMIN_TOKEN:"test-admin-signing-secret",
    TELEGRAM_BOT_TOKEN:"123:test-bot-token"
  };
}

test("Telegram webhook status accepts the signed Admin session and exposes only safe bot identity", async () => {
  const e=env();
  const token=await issueAdminToken(e);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async url => {
    const method=String(url).split("/").pop();
    const result=method==="getMe"
      ? {id:123456,is_bot:true,first_name:"PT Xtra",username:"ptx_test_bot"}
      : {url:"https://phanthuanxtra.com/api/telegram/webhook",pending_update_count:0};
    return new Response(JSON.stringify({ok:true,result}),{status:200,headers:{"content-type":"application/json"}});
  };
  try{
    const request=new Request("https://phanthuanxtra.com/api/admin/telegram/webhook-status",{
      headers:{Authorization:`Bearer ${token}`}
    });
    const response=await handleTelegramIngest(request,e,{});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.url_matches_expected,true);
    assert.deepEqual(body.bot,{id:123456,username:"ptx_test_bot",name:"PT Xtra",is_bot:true});
    assert.equal(JSON.stringify(body).includes(e.TELEGRAM_BOT_TOKEN),false);
  } finally {
    globalThis.fetch=originalFetch;
  }
});

test("Telegram webhook admin routes reject an invalid bearer token", async () => {
  const response=await handleTelegramIngest(new Request("https://phanthuanxtra.com/api/admin/telegram/webhook-status",{
    headers:{Authorization:"Bearer invalid"}
  }),env(),{});
  assert.equal(response.status,401);
});
