import test from "node:test";
import assert from "node:assert/strict";
import { handleLylyBridge } from "../src/lyly-bridge.js";

const TOKEN = "t".repeat(48);
const url = path => "https://phanthuanxtra.com/api/lyly/" + path;
const request = (path, token = TOKEN, opts = {}) =>
  new Request(url(path), { ...opts, headers: { ...(token ? { authorization: "Bearer " + token } : {}), ...(opts.headers || {}) } });
const env = () => ({
  LYLY_BRIDGE_TOKEN: TOKEN,
  DB: { prepare(sql) {
    assert.match(sql, /^SELECT /);
    return { first: async () => ({ n: 2 }), bind(...params) {
      assert.ok(params[0] <= 50);
      return { all: async () => ({ results: [{ id: "tg-652", status: "hidden" }] }) };
    } };
  } },
  MEDIA: { list: async opts => ({ truncated: false, objects: [{ key: "vehicles/sample.webp", size: 42, uploaded: new Date("2026-10-15T00:00:00Z") }] }) },
  AI: { run: async () => ({ response: "Xin chào bằng tiếng Việt." }) }
});
test("unrelated routes are not intercepted", async () => {
  assert.equal(await handleLylyBridge(new Request("https://phanthuanxtra.com/api/cars"), env()), null);
});
test("missing secret fails closed", async () => {
  assert.equal((await handleLylyBridge(request("health"), {})).status, 503);
});
test("all data routes require separate strong bearer token", async () => {
  assert.equal((await handleLylyBridge(request("health", null), env())).status, 401);
  assert.equal((await handleLylyBridge(request("d1/cars", "x".repeat(48)), env())).status, 401);
  assert.equal((await handleLylyBridge(request("r2", "x".repeat(48)), env())).status, 401);
});
test("health reports bindings, without exposing secrets", async () => {
  const result = await handleLylyBridge(request("health"), env());
  const data = await result.json();
  assert.equal(result.status, 200);
  assert.equal(data.bindings.workers_ai, true);
  assert.equal(JSON.stringify(data).includes(TOKEN), false);
});
test("D1 reads are allowlisted SELECT with bounded limits", async () => {
  const cars = await (await handleLylyBridge(request("d1/cars?limit=100000"), env())).json();
  const sum = await (await handleLylyBridge(request("d1/summary"), env())).json();
  assert.equal(cars.cars[0].status, "hidden");
  assert.equal(sum.counts.leads, 2);
});
test("R2 returns object metadata and blocks bad prefixes", async () => {
  const data = await (await handleLylyBridge(request("r2?prefix=vehicles/"), env())).json();
  assert.equal(data.files[0].size_bytes, 42);
  assert.equal(data.files[0].uploaded, "2026-10-15T00:00:00.000Z");
  assert.equal((await handleLylyBridge(request("r2?prefix=../"), env())).status, 400);
});
test("AI accepts only bounded POST and never changes D1/R2", async () => {
  assert.equal((await handleLylyBridge(request("ai"), env())).status, 405);
  const result = await handleLylyBridge(request("ai", TOKEN, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Xin chào" }) }), env());
  const data = await result.json();
  assert.equal(result.status, 200);
  assert.equal(data.answer, "Xin chào bằng tiếng Việt.");
});
test("AI quota exhaustion does not fall through to paid service", async () => {
  const e = env(); e.AI.run = async () => { throw new Error("3036 daily quota exceeded"); };
  const result = await handleLylyBridge(request("ai", TOKEN, { method: "POST", body: JSON.stringify({ message: "Giúp tôi" }) }), e);
  assert.equal(result.status, 429);
  assert.equal((await result.json()).code, "quota_or_rate_limit");
});


test("Workers AI request disables thinking and requests enough completion tokens", async () => {
  const e = env();
  let modelName, input;
  e.AI.run = async (model, args) => {
    modelName = model;
    input = args;
    return { choices: [{ message: { content: "Lyly xin chào." } }] };
  };
  const result = await handleLylyBridge(request("ai", TOKEN, { method: "POST", body: JSON.stringify({ message: "Xin chào" }) }), e);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).answer, "Lyly xin chào.");
  assert.equal(modelName, "@cf/zai-org/glm-4.7-flash");
  assert.equal(input.chat_template_kwargs.enable_thinking, false);
  assert.equal(input.reasoning_effort, "low");
  assert.ok(input.max_completion_tokens >= 700);
  assert.ok(input.max_completion_tokens <= 1000);
});
test("Workers AI extracts nonempty choices when legacy response is empty", async () => {
  const e = env();
  e.AI.run = async () => ({ response: "", choices: [{ message: { content: [{ type: "text", text: "Kết quả hợp lệ." }] } }] });
  const result = await handleLylyBridge(request("ai", TOKEN, { method: "POST", body: JSON.stringify({ message: "Kiểm thử" }) }), e);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).answer, "Kết quả hợp lệ.");
});
test("Workers AI never reveals private reasoning as response", async () => {
  const e = env();
  e.AI.run = async () => ({ choices: [{ message: { content: null, reasoning_content: "hidden internal trace" } }] });
  const result = await handleLylyBridge(request("ai", TOKEN, { method: "POST", body: JSON.stringify({ message: "Kiểm thử" }) }), e);
  const data = await result.json();
  assert.equal(result.status, 502);
  assert.equal(data.code, "empty_model_response");
  assert.equal(JSON.stringify(data).includes("hidden internal trace"), false);
});
