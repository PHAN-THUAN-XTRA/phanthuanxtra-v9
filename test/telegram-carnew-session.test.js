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
  const block=router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview="));
  assert.match(block,/message_id>\?/);
  assert.match(block,/opened_message_id/);
  assert.match(block,/bundle_status IN \('pending','queued'\)/);
  assert.match(block,/uniquePhotos\.slice\(-16\)/);
  assert.match(block,/await processBundle\(env,String\(active\.session_key\),chatId\)/);
  assert.match(block,/Đang tạo draft AVIF \+ WebP/);
  assert.doesNotMatch(block,/LIMIT 100/);
});


test("/carfinish keeps only the newest 16 photos and newest article",()=>{
  const block=router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview="));
  assert.match(block,/const selectedPhotos=uniquePhotos\.slice\(-16\)/);
  assert.match(block,/const selectedText=texts\.at\(-1\)/);
  assert.match(block,/selectedIds\.has\(Number\(row\.id\)\)/);
  assert.match(block,/SET bundle_key=\?,bundle_status='pending'/);
  assert.match(block,/selectedPhotos\.length/);
  assert.match(block,/ctx\)ctx\.waitUntil\(task\)/);
  assert.match(block,/await processBundle\(env,String\(active\.session_key\),chatId\)/);
  assert.doesNotMatch(block,/LIMIT 100/);
});


test("/carfinish repairs Defender intake to exactly 16 unique newest photos and owner price",()=>{
  const block=router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview="));
  assert.match(block,/file_unique_id/);
  assert.match(block,/new Map\(\)/);
  assert.match(block,/uniquePhotos\.slice\(-16\)/);
  assert.match(block,/selectedPhotos\.length!==16/);
  assert.match(block,/DELETE FROM telegram_inbox/);
  assert.match(block,/bundle_status IN \('pending','queued'\)/);
  assert.match(block,/4879000000/);
  assert.match(block,/_owner_price_locked/);
  assert.match(block,/ctx\)ctx\.waitUntil\(task\)/);
  assert.match(block,/await processBundle\(env,String\(active\.session_key\),chatId\)/);
  assert.doesNotMatch(block,/LIMIT 100/);
});


test("/carfinish can recover Defender rows already consumed by the durable worker",()=>{
  const block=router.slice(router.indexOf("const carFinish="),router.indexOf("const carReview="));
  assert.match(block,/bundle_status IN \('pending','queued','done'\)/);
  assert.match(block,/SELECT id,file_id,file_unique_id,caption,bundle_status/);
  assert.match(block,/uniquePhotos\.slice\(-16\)/);
  assert.match(block,/selectedPhotos\.length!==16/);
  assert.match(block,/4879000000/);
});
