import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { reconcileTelegramNotifications } from "../src/telegram-notifications.js";

const source=fs.readFileSync("src/telegram-notifications.js","utf8");

test("Telegram notification reconciler suppresses CI vehicle audit IDs",()=>{
  assert.match(source,/stage3-/);
  assert.match(source,/ci-e2e-/);
  assert.match(source,/ci-origin-e2e-/);
  assert.match(source,/telegram_notification_e2e_suppressed/);
  assert.match(source,/UPDATE telegram_notification_cursor SET last_audit_id/);
});

test("ID-prefix suppression stays scoped to car audits while explicit E2E summaries work across resources",()=>{
  assert.match(source,/explicitE2eSummary/);
  assert.match(source,/if\(explicitE2eSummary\)return true/);
  assert.match(source,/event\?\.resource===["']car["']/);
});


test("Telegram notification reconciler suppresses publishing E2E numeric car IDs by explicit summary marker",()=>{
  assert.match(source,/PTX-E2E/);
  assert.match(source,/String\(event\?\.summary\|\|""\)/);
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/title:'PTX-E2E — PHAN THUẦN XTRA — kiểm thử xuất bản'/);
});

test("suppression marker is explicit and does not suppress arbitrary numeric car IDs",()=>{
  assert.doesNotMatch(source,/^\s*return\s+\/\\d/m);
});

test("Telegram notification reconciler suppresses Blog production E2E audit titles",()=>{
  assert.match(source,/PHAN THUẦN XTRA Blog E2E/);
});

test("Content Prep numeric Blog fixture audits are suppressed while real posts and vehicles notify correctly", async t => {
  const fixtures = [495, 498, 501, 504, 507].map((id, index) => ({
    id: index + 2, action: "delete", resource: "post",
    resource_id: String(id), summary: "CI — Nháp đã được owner kiểm tra"
  }));
  const events = [
    { id: 1, action: "create", resource: "post", resource_id: "495", summary: "draft: CI — Nội dung nháp riêng tư" },
    ...fixtures,
    { id: 7, action: "update", resource: "post", resource_id: "510", summary: "draft: CI — Nháp đã được owner kiểm tra" },
    { id: 8, action: "delete", resource: "post", resource_id: "511", summary: "Tin xe thị trường tháng 10" },
    { id: 9, action: "update", resource: "post", resource_id: "512", summary: "Tin xe đã cập nhật" },
    { id: 10, action: "delete", resource: "car", resource_id: "tg-712", summary: "AUDI Q7" },
    { id: 11, action: "create", resource: "car", resource_id: "ci-origin-e2e-999", summary: "PT XTRA TEST" },
    { id: 12, action: "update", resource: "car", resource_id: "tg-713", summary: "Mercedes GLS" },
  ];
  let cursor = 0;
  const sent = [];
  const db = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() {
          if (sql.startsWith("SELECT last_audit_id")) return { last_audit_id: cursor };
          if (sql.includes("FROM cars WHERE id=?")) return { status: "available" };
          throw new Error("Unexpected D1 first: " + sql);
        },
        async all() {
          if (sql.includes("FROM cms_audit_log")) return { results: events.filter(e => e.id > args[0]).slice(0, 25) };
          throw new Error("Unexpected D1 all: " + sql);
        },
        async run() {
          if (sql.startsWith("UPDATE telegram_notification_cursor")) { cursor = args[0]; return { success: true }; }
          throw new Error("Unexpected D1 write: " + sql);
        }
      };
    }
  };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(String(url), /api\\.telegram\\.org\\/bot/);
    sent.push(JSON.parse(options.body).text);
    return Response.json({ ok: true });
  });
  const result = await reconcileTelegramNotifications({
    DB: db, TELEGRAM_BOT_TOKEN: "fixture-bot", TELEGRAM_CHAT_ID: "fixture-chat"
  });
  assert.equal(result.ok, true);
  assert.equal(result.processed, 12);
  assert.equal(result.last_audit_id, 12);
  assert.equal(cursor, 12);
  assert.equal(sent.length, 4, "only legitimate CMS notifications should reach Telegram");
  assert.match(sent[0], /ĐÃ XOÁ BÀI BLOG/);
  assert.match(sent[0], /Tin xe thị trường tháng 10/);
  assert.doesNotMatch(sent[0], /XOÁ BÀI XE/);
  assert.match(sent[1], /ĐÃ CẬP NHẬT BÀI BLOG/);
  assert.match(sent[2], /ĐÃ XOÁ BÀI XE/);
  assert.match(sent[2], /AUDI Q7/);
  assert.match(sent[3], /ĐÃ CẬP NHẬT BÀI XE/);
  assert.ok(sent.every(message => !message.includes("Nháp đã được owner kiểm tra")));
});

test("Content Prep fixture suppression does not blanket-filter ordinary numeric post IDs", () => {
  const source = fs.readFileSync("src/telegram-notifications.js", "utf8");
  assert.match(source, /event\\?\\.resource==="post"/);
  assert.match(source, /title==="CI — Nội dung nháp riêng tư"/);
  assert.match(source, /title==="CI — Nháp đã được owner kiểm tra"/);
  assert.doesNotMatch(source, /\\/\\^\\\\d/);
});
