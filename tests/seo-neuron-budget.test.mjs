import test from "node:test";
import assert from "node:assert/strict";
import { reconcileSeo } from "../src/seo-ai.js";

function envWithFailures(message) {
  const posts = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1, title: "Xe mẫu", excerpt: "Thông tin", content: "Nội dung", updated_at: "2026-09-27"
  }));
  let calls = 0;
  const DB = { prepare(sql) {
    if (sql.startsWith("SELECT id,title")) return { all: async () => ({ results: posts }) };
    if (sql.startsWith("SELECT content_hash")) return { bind: () => ({ first: async () => null }) };
    throw new Error("Unexpected SQL");
  } };
  const AI = { run: async () => { calls++; throw new Error(message); } };
  return { env: { DB, AI }, calls: () => calls };
}

test("SEO cron limits failed inference attempts per run", async () => {
  const fixture = envWithFailures("temporary model error");
  const result = await reconcileSeo(fixture.env);
  assert.equal(fixture.calls(), 3);
  assert.equal(result.attempted, 3);
  assert.equal(result.failed, 3);
});

test("SEO cron stops immediately on account daily neuron limit", async () => {
  const fixture = envWithFailures("4006: daily free allocation of 10,000 neurons exhausted");
  const result = await reconcileSeo(fixture.env);
  assert.equal(fixture.calls(), 1);
  assert.equal(result.attempted, 1);
  assert.equal(result.failed, 1);
});
