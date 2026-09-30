import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const router=fs.readFileSync("src/telegram-router.js","utf8");
const migration=fs.readFileSync("migrations/0022_recover_lx570_18_image_bundle.sql","utf8");

test("/carnew opens a recoverable vehicle session and adopts pending intake",()=>{
    assert.ok(router.includes('const carNew=/^\\/carnew\\s*$/i.test(caption);'));
  assert.match(router,/vehicle-session/);
  assert.match(router,/bundle_status='pending'/);
  assert.match(router,/Đã thu hồi/);
});

test("LX570 recovery is narrow and locks exactly 18 following photos",()=>{
    assert.ok(migration.includes("UPPER(caption) LIKE '%LEXUS%LX570%'"));
  assert.match(migration,/p\.chat_id = t\.chat_id/);
  assert.match(migration,/ABS\(p\.id-t\.id\)/);
  assert.match(migration,/LIMIT 18/);
  assert.match(migration,/bundle_status = 'queued'/);
});
