import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const router=fs.readFileSync("src/telegram-router.js","utf8");
const migration=fs.readFileSync("migrations/0022_recover_lx570_18_image_bundle.sql","utf8");

test("/carnew opens a clean vehicle session without adopting legacy pending intake",()=>{
  assert.ok(router.includes('const carNew=/^\\/carnew\\s*$/i.test(caption);'));
  assert.match(router,/vehicle-session/);
  const block=router.slice(router.indexOf("const carNew="),router.indexOf("const carReview="));
  assert.doesNotMatch(block,/ORDER BY id DESC LIMIT 100/);
  assert.doesNotMatch(block,/Đã thu hồi/);
  assert.match(block,/không thu hồi ảnh pending cũ/);
});

test("/carcancel closes the active session and detaches only its pending rows",()=>{
  assert.ok(router.includes('const carCancel=/^\\/carcancel\\s*$/i.test(caption);'));
  assert.match(router,/SET bundle_key=NULL/);
  assert.match(router,/bundle_status='pending'/);
  assert.match(router,/SET status='closed'/);
});

test("LX570 recovery is narrow and locks exactly 18 following photos",()=>{
    assert.ok(migration.includes("UPPER(caption) LIKE '%LEXUS%LX570%'"));
  assert.ok(migration.includes('p.chat_id=t.chat_id'));
  assert.match(migration,/ABS\(p\.id-t\.id\)/);
  assert.match(migration,/LIMIT 18/);
  assert.ok(migration.includes("bundle_status='queued'"));
});

test("/carfinish scopes finalization to rows sent after the active clean session opened",()=>{
  assert.ok(router.includes('const carFinish=/^\\/carfinish\\s*$/i.test(caption);'));
  assert.match(router,/message_id>\?/);
  assert.match(router,/opened_message_id/);
  // /carfinish is intentionally durable: it queues the finalized session and
  // returns promptly instead of processing the full gallery inside the webhook.
  assert.match(router,/SET bundle_status='queued'/);
  assert.match(router,/Đã xếp hàng tạo draft AVIF \+ WebP/);
  const block=router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview="));
  assert.doesNotMatch(block,/await processBundle\(/);
  assert.doesNotMatch(router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview=")),/LIMIT 100/);
});
