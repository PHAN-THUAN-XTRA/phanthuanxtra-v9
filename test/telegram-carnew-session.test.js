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

test("/carfinish is generic: keeps all unique session photos and exact owner copy",()=>{
  const block=router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview="));
  assert.match(block,/message_id>\?/);
  assert.match(block,/opened_message_id/);
  assert.match(block,/new Map\(\)/);
  assert.match(block,/const selectedPhotos=\[\.\.\.newestByIdentity\.values\(\)\]/);
  assert.match(block,/const selectedText=texts\.at\(-1\)/);
  assert.match(block,/bundle_status='queued'/);
  assert.match(block,/reconcileTelegramVehicleDrafts\(env\)/);
  assert.match(block,/selectedPhotos\.length/);
  assert.match(block,/Nội dung owner được giữ nguyên/);
  assert.doesNotMatch(block,/slice\(-16\)/);
  assert.doesNotMatch(block,/selectedPhotos\.length!==16/);
  assert.doesNotMatch(block,/4879000000/);
  assert.doesNotMatch(block,/DEFENDER/);
  assert.doesNotMatch(block,/_owner_price_locked/);
});

test("/carfinish uses durable queue and can recover interrupted processing",()=>{
  const block=router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview="));
  assert.match(router,/reconcileTelegramVehicleDrafts/);
  assert.match(block,/processing/);
  assert.match(block,/failed/);
  assert.match(block,/bundle_status='queued'/);
  assert.match(block,/status='closed'/);
  assert.match(block,/reconcileTelegramVehicleDrafts\(env\)/);
  assert.doesNotMatch(block,/await processBundle\(env,String\(active\.session_key\),chatId\)/);
});
