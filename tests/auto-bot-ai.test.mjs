import test from "node:test";
import assert from "node:assert/strict";
import { AUTO_MODELS, answerAutoCustomer, autoBlogSlug, canPublishAutoBlog, createBlogPost, generateVehicleBlog, isAutoChat, parseAutoCommand, readBlogToolCall } from "../src/auto-bot-ai.js";
import { handleTelegramRouter, processTelegramUpdate } from "../src/telegram-router.js";

const draft = { title: "Toyota Vios qua ảnh thực tế", content: "Xe trong ảnh có màu trắng, nhận dạng phù hợp với Toyota Vios. Thông tin nhận dạng qua ảnh cần được đối chiếu trực tiếp; chưa có dữ liệu xác minh năm sản xuất hoặc tình trạng máy móc.", excerpt: "Nhận dạng xe qua ảnh." };
const toolResponse = args => ({ choices: [{ message: { tool_calls: [{ type: "function", function: { name: "createBlogPost", arguments: JSON.stringify(args) } }] } }] });
function database() {
  const posts = new Map(); let writes = 0;
  return { posts, get writes() { return writes; }, prepare(sql) { return { bind(...args) { return {
    async first() { return sql.includes("WHERE slug=") ? posts.get(args[0]) || null : [...posts.values()].find(p => p.id === args[0]) || null; },
    async run() {
      if (sql.startsWith("INSERT INTO posts")) {
        if (posts.has(args[1])) throw new Error("UNIQUE constraint failed: posts.slug");
        const post = { id: posts.size + 1, title: args[0], slug: args[1], content: args[3], cover_image: args[4], status: args[7] };
        posts.set(post.slug, post); writes++; return { meta: { last_row_id: post.id } };
      }
      assert.match(sql, /INSERT INTO cms_audit_log/); return { meta: { changes: 1 } };
    }
  }; } }; } };
}
test("command suffix, customer text and inventory captions are routed deliberately", () => {
  assert.deepEqual(parseAutoCommand("/blog@phanthuanxtra_auto_bot Toyota"), { name: "blog", body: "Toyota" });
  assert.equal(parseAutoCommand("/blog@other_bot Toyota"), null);
  assert.equal(isAutoChat("Tư vấn giúp tôi xe gia đình"), true);
  assert.equal(isAutoChat("Toyota Vios 2020, ODO 20000 km, giá 400 triệu"), false);
  assert.equal(isAutoChat("Vios 2020 bao nhiêu?"), true);
  assert.equal(canPublishAutoBlog({}, "1"), false);
  assert.equal(canPublishAutoBlog({ TELEGRAM_CHAT_ID: "-1001" }, "-1001"), true);
  assert.equal(canPublishAutoBlog({ TELEGRAM_AUTO_PUBLISH_CHAT_IDS: "1,2", TELEGRAM_CHAT_ID: "3" }, "3"), false);
});
test("chat falls back on model failure and never offers publishing tools", async () => {
  const calls = [];
  const result = await answerAutoCustomer({ AI: { async run(model, input) {
    calls.push(model); assert.equal(input.tools, undefined);
    if (model !== AUTO_MODELS.reasoning) throw new Error("capacity");
    return { choices: [{ message: { content: "Bạn cần xe mấy chỗ?" } }] };
  } } }, "Tư vấn xe");
  assert.deepEqual(calls, [AUTO_MODELS.chat, AUTO_MODELS.fallback, AUTO_MODELS.reasoning]);
  assert.equal(result.answer, "Bạn cần xe mấy chỗ?");
});
test("shared daily quota exhaustion stops costly fallback", async () => {
  let calls = 0;
  await assert.rejects(answerAutoCustomer({ AI: { async run() { calls++; throw new Error("3036 daily quota"); } } }, "xe"), /hạn mức/);
  assert.equal(calls, 1);
});
test("tool dispatcher rejects extra authority, wrong function, missing fields and multiple calls", () => {
  assert.deepEqual(readBlogToolCall(toolResponse(draft)), draft);
  for (const args of [{ ...draft, status: "published" }, { ...draft, slug: "injected" }, { title: "test" }]) assert.throws(() => readBlogToolCall(toolResponse(args)));
  assert.throws(() => readBlogToolCall({ tool_calls: [{ name: "deletePost", arguments: draft }] }));
  assert.throws(() => readBlogToolCall({ tool_calls: [] }));
  assert.throws(() => readBlogToolCall({ tool_calls: [{ name: "createBlogPost", arguments: draft }, { name: "createBlogPost", arguments: draft }] }));
});
test("vision precedes tool generation; malformed tool output falls back", async () => {
  const calls = [];
  const result = await generateVehicleBlog({ AI: { async run(model, input) {
    calls.push({ model, input });
    if (!input.tools) return { response: JSON.stringify({ brand: "Toyota", model: "Vios", confidence: 0.9, color: "trắng", _ai_model: model }) };
    if (model === AUTO_MODELS.vision) return { response: "not a tool call" };
    return toolResponse(draft);
  } } }, new Uint8Array([1]).buffer, "image/jpeg", "Vios");
  assert.equal(calls[0].model, AUTO_MODELS.vision);
  assert.equal(calls[0].input.messages[1].content[0].type, "image_url");
  assert.equal(result.model, AUTO_MODELS.fallback);
  assert.deepEqual(result.draft, draft);
});
test("uncertain image never generates or publishes a blog", async () => {
  let calls = 0;
  await assert.rejects(generateVehicleBlog({ AI: { async run() { calls++; return { response: JSON.stringify({ brand: "Toyota", model: null, confidence: 0.4 }) }; } } }, new Uint8Array([1]).buffer, "image/jpeg", ""), /chưa đủ rõ/);
  assert.equal(calls, 1);
});
test("publication has server-side permissions and unique slug protects concurrent retries", async () => {
  const DB = database();
  const env = { DB, TELEGRAM_CHAT_ID: "123" };
  const slug = await autoBlogSlug("123", 8);
  const options = { chatId: "123", slug, coverImage: "/media/blog/test.jpg" };
  await assert.rejects(createBlogPost(env, draft, { ...options, chatId: "456" }), /quyền/);
  assert.equal(DB.writes, 0);
  const results = await Promise.all([createBlogPost(env, draft, options), createBlogPost(env, draft, options)]);
  assert.equal(DB.writes, 1);
  assert.equal(results.filter(r => r.duplicate).length, 1);
  assert.equal(results[0].post.status, "published");
});
test("photo /blog creates one public post and retries skip AI and R2", async t => {
  const DB = database(); let aiCalls = 0, uploads = 0; const replies = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url.includes("/getFile")) return Response.json({ ok: true, result: { file_path: "photos/image.jpg" } });
    if (url.includes("/file/bot")) return new Response(new Uint8Array([1, 2]), { headers: { "content-type": "image/jpeg" } });
    replies.push(JSON.parse(init.body)); return Response.json({ ok: true, result: {} });
  });
  const env = { DB, TELEGRAM_CHAT_ID: "123", TELEGRAM_AUTO_BOT_TOKEN: "test", MEDIA: { async put() { uploads++; } }, AI: { async run(model, input) {
    aiCalls++; return input.tools ? toolResponse(draft) : { response: JSON.stringify({ brand: "Toyota", model: "Vios", confidence: 0.9 }) };
  } } };
  const update = { message: { chat: { id: 123 }, message_id: 5, caption: "/blog Vios", photo: [{ file_id: "file" }] } };
  await processTelegramUpdate(env, update, "123");
  await processTelegramUpdate(env, update, "123");
  assert.equal(aiCalls, 2); assert.equal(uploads, 1); assert.equal(DB.writes, 1);
  assert.match(replies[0].text, /https:\/\/phanthuanxtra.com\/blog\/telegram-/);
});
test("unauthorized blog and wrong webhook secret cannot trigger AI, media or D1", async t => {
  const replies = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => { replies.push(JSON.parse(init.body)); return Response.json({ ok: true, result: {} }); });
  const env = { TELEGRAM_AUTO_BOT_TOKEN: "test", TELEGRAM_WEBHOOK_SECRET: "secret", TELEGRAM_CHAT_ID: "123" };
  await processTelegramUpdate(env, { message: { chat: { id: 999 }, message_id: 1, text: "/blog title\ncontent" } }, "999");
  assert.match(replies[0].text, /chưa được cấp quyền/);
  const response = await handleTelegramRouter(new Request("https://example.com/api/telegram/webhook", { method: "POST", body: "{}" }), env, null);
  assert.equal(response.status, 401); assert.equal(replies.length, 1);
});
