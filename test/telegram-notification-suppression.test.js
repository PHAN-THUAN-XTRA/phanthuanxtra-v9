import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/telegram-notifications.js","utf8");

test("Telegram notification reconciler suppresses CI vehicle audit IDs",()=>{
  assert.match(source,/stage3-/);
  assert.match(source,/ci-e2e-/);
  assert.match(source,/ci-origin-e2e-/);
  assert.match(source,/telegram_notification_e2e_suppressed/);
  assert.match(source,/UPDATE telegram_notification_cursor SET last_audit_id/);
});

test("suppression is scoped to car audit events",()=>{
  assert.match(source,/event\?\.resource!==["']car["']/);
});


test("Telegram notification reconciler suppresses publishing E2E numeric car IDs by explicit summary marker",()=>{
  assert.match(source,/PTX-E2E/);
  assert.match(source,/String\(event\.summary\|\|""\)/);
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/title:'PTX-E2E — PHAN THUẦN XTRA — kiểm thử xuất bản'/);
});

test("suppression marker is explicit and does not suppress arbitrary numeric car IDs",()=>{
  assert.doesNotMatch(source,/^\s*return\s+\/\\d/m);
});
