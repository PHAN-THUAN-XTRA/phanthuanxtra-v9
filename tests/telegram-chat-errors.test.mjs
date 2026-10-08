import test from "node:test";
import assert from "node:assert/strict";
import { answerAutoCustomer, AUTO_MODELS } from "../src/auto-bot-ai.js";
import { handleTelegramRouter } from "../src/telegram-router.js";

async function failedChat(t, AI) {
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
    TELEGRAM_AUTO_BOT_TOKEN: "fixture", TELEGRAM_WEBHOOK_SECRET: "fixture", AI,
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

test("unrelated Telegram transport failures retain the generic safe error boundary", async t => {
  const replies = [];
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    const message = JSON.parse(init.body);
    if (message.text === "fixture answer") return Response.json({ ok: false, description: "PRIVATE_PROVIDER_DETAILS" });
    replies.push(message);
    return Response.json({ ok: true, result: {} });
  });
  await handleTelegramRouter(new Request("https://example.com/api/telegram/webhook", {
    method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": "fixture" },
    body: JSON.stringify({ message: { message_id: 1, chat: { id: 123 }, text: "/chat xe" } })
  }), { TELEGRAM_AUTO_BOT_TOKEN: "fixture", TELEGRAM_WEBHOOK_SECRET: "fixture", AI: { async run() { return { response: "fixture answer" }; } } }, null);
  assert.match(replies.at(-1).text, /Chưa xử lý được yêu cầu/);
  assert.doesNotMatch(JSON.stringify(replies), /PRIVATE_PROVIDER_DETAILS|AI_QUOTA_EXHAUSTED/);
});
