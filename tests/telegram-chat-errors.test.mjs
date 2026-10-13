import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { answerAutoCustomer, AUTO_MODELS } from "../src/auto-bot-ai.js";
import { handleTelegramRouter } from "../src/telegram-router.js";

function fixtureDb(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(fs.readFileSync(new URL('../migrations/0042_telegram_chat_jobs.sql',import.meta.url),'utf8'));
 return {DB:{prepare(query){let args=[];const s={bind(...values){args=values;return s;},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};}};return s;}},sql};
}

async function failedChat(t, AI) {
  const {DB}=fixtureDb();
  const replies = [], logs = [], tasks = [];
  t.mock.method(console, "warn", (...args) => logs.push(args));
  t.mock.method(console, "error", (...args) => logs.push(args));
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.telegram.org/botfixture/sendMessage");
    replies.push(JSON.parse(init.body));
    return Response.json({ ok: true, result: { message_id: replies.length } });
  });
  const request = new Request("https://example.com/api/telegram/webhook", {
    method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": "fixture" },
    body: JSON.stringify({ message: { message_id: 1, chat: { id: 123 }, text: "/chat PRIVATE_QUESTION" } })
  });
  const response = await handleTelegramRouter(request, {
    TELEGRAM_AUTO_BOT_TOKEN: "fixture", TELEGRAM_WEBHOOK_SECRET: "fixture", DB, AI,
    GEMINI_API_KEY: "fixture", GEMINI_MODEL: "gemini-fixture"
  }, { waitUntil(task) { tasks.push(task); } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).queued, true);
  await Promise.all(tasks);
  assert.equal(replies.length, 2);
  assert.match(replies[0].text, /Đã nhận yêu cầu/);
  assert.doesNotMatch(JSON.stringify({ replies, logs }), /PRIVATE_QUESTION|fixture|PRIVATE_PROVIDER_DETAILS/);
  return { reply: replies[1].text, logs };
}

test("queued /chat reports confirmed daily quota and makes only one inference attempt", async t => {
  let calls = 0;
  const { reply, logs } = await failedChat(t, { async run() {
    calls++;
    throw Object.assign(new Error("PRIVATE_PROVIDER_DETAILS"), { code: 3036 });
  } });
  assert.equal(calls, 1);
  assert.match(reply, /AI_QUOTA_EXHAUSTED/);
  assert.match(reply, /07:00/);
  assert.match(JSON.stringify(logs), /AI_QUOTA_EXHAUSTED/);
});

test("missing AI binding produces a configuration diagnosis without leaking credentials", async t => {
  const { reply } = await failedChat(t, undefined);
  assert.match(reply, /AI_NOT_CONFIGURED/);
});

for (const [failure, expected] of [
  ["3040 Capacity temporarily exceeded", "AI_CAPACITY"],
  ["HTTP 429 Too Many Requests", "AI_RATE_LIMITED"],
  ["3007 Request timeout", "AI_TIMEOUT"],
  ["5007 No such model", "AI_MODEL_UNAVAILABLE"],
  ["5035 This model requires a Workers Paid plan", "AI_ACCESS_DENIED"],
  ["PRIVATE_PROVIDER_DETAILS", "AI_UNAVAILABLE"]
]) {
  test(`/chat distinguishes ${expected} without claiming daily quota exhaustion`, async t => {
    let calls = 0;
    const { reply } = await failedChat(t, { async run() { calls++; throw new Error(failure); } });
    assert.equal(calls, 3);
    assert.match(reply, new RegExp(expected));
    assert.doesNotMatch(reply, /AI_QUOTA_EXHAUSTED|07:00/);
  });
}

test("empty AI output is reported as empty output, not quota exhaustion", async t => {
  const { reply } = await failedChat(t, { async run() { return { response: " " }; } });
  assert.match(reply, /AI_EMPTY_RESPONSE/);
});

test("a busy primary can still succeed on the existing fallback without a capacity queue", async t => {
  t.mock.method(console, "warn", () => {});
  const calls = [];
  const result = await answerAutoCustomer({ AI: { async run(model, input, options) {
    calls.push(model);
    assert.deepEqual(options, { rejectIfBusy: true });
    assert.equal(input.tools, undefined);
    if (calls.length === 1) throw new Error("3040 Capacity temporarily exceeded");
    return { choices: [{ message: { content: "Hãy chuẩn bị danh sách cần kiểm tra." } }] };
  } } }, "Đi xem xe cần chuẩn bị gì?");
  assert.deepEqual(calls, [AUTO_MODELS.chat, AUTO_MODELS.fallback]);
  assert.equal(result.model, AUTO_MODELS.fallback);
  assert.equal(result.answer, "Hãy chuẩn bị danh sách cần kiểm tra.");
});

test("unconfirmed Telegram send is held uncertain and does not leak provider response", async t => {
 const {DB,sql}=fixtureDb(),replies=[];
 t.mock.method(console,"warn",()=>{});
 t.mock.method(globalThis,"fetch",async(_url,init)=>{
  const m=JSON.parse(init.body);
  if(m.text==="fixture answer")return Response.json({ok:false,description:"PRIVATE_PROVIDER_DETAILS"},{status:503});
  replies.push(m);return Response.json({ok:true,result:{message_id:1}});
 });
 const req=new Request("https://example.com/api/telegram/webhook",{method:"POST",headers:{"X-Telegram-Bot-Api-Secret-Token":"fixture"},body:JSON.stringify({message:{message_id:1,chat:{id:123},text:"/chat xe"}})});
 const env={DB,TELEGRAM_AUTO_BOT_TOKEN:"fixture",TELEGRAM_WEBHOOK_SECRET:"fixture",AI:{async run(){return {response:"fixture answer"};}}};
 assert.equal((await handleTelegramRouter(req,env,null)).status,200);
 assert.equal(sql.prepare("SELECT state FROM xtra_telegram_chat_jobs").get().state,"uncertain");
 assert.equal(replies.length,1);
 assert.doesNotMatch(JSON.stringify(replies),/PRIVATE_PROVIDER_DETAILS/);
});
