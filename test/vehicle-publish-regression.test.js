import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const entry=fs.readFileSync("src/entry.js","utf8");
const ingest=fs.readFileSync("src/telegram-ingest.js","utf8");
const router=fs.readFileSync("src/telegram-router.js","utf8");
const telegram=fs.readFileSync("src/telegram.js","utf8");

test("car detail HTML is served through explicit UTF-8 Worker boundary",()=>{
  assert.match(entry,/url\.pathname === "\/car"/);
  assert.match(entry,/\/car\.html/);
  assert.match(entry,/text\/html; charset=utf-8/);
  assert.match(entry,/accept-encoding", "identity"/);
});

test("published vehicle media URL preserves R2 path separators",()=>{
  assert.match(ingest,/split\("\/"\)\.map\(encodeURIComponent\)\.join\("\/"\)/);
  assert.doesNotMatch(ingest,/media\/\$\{encodeURIComponent\(key\)\}/);
});

test("successful car publish cannot be reported failed by Telegram link preview",()=>{
  const start=router.indexOf('const carPublish=');
  const end=router.indexOf('if (["start", "help"]',start);
  const block=router.slice(start,end);
  assert.match(block,/let result/);
  assert.match(block,/disable_web_page_preview:true/);
  assert.match(block,/telegram_car_publish_confirmation_failed/);
  assert.match(block,/\/car\?id=\$\{encodeURIComponent\(result\.car_id\)\}/);
  assert.ok(block.indexOf("publishReviewedCar") < block.indexOf("telegram_car_publish_confirmation_failed"));
});


test("Telegram publish survives WEBPAGE_CURL_FAILED from remote gallery fetch",()=>{
  assert.match(telegram,/WEBPAGE_CURL_FAILED/);
  assert.match(telegram,/disable_web_page_preview:true/);
  assert.match(telegram,/continue/);
  assert.match(telegram,/telegram_posts SET status='published'/);
});


test("approved publish retry resyncs an existing website car from the draft",()=>{
  const promote=ingest.slice(ingest.indexOf("async function promoteDraft"),ingest.indexOf("/** Atomically claims"));
  assert.match(promote,/mode:existing\?"update":"create"/);
  assert.match(promote,/description,features,featured:false,cover_image:imageUrl,images:imageUrls\.length\?imageUrls:\[imageUrl\]/);
  assert.doesNotMatch(promote,/if\(!existing\)\{const saved=/);
});


test("car detail gallery includes the cover and numbers the complete image set from 1",()=>{
  const page=fs.readFileSync("public/car.html","utf8");
  assert.match(page,/cover=c\.cover_image\|\|imgs\[0\]\|\|'',gallery=imgs,features=/);
  assert.doesNotMatch(page,/gallery=imgs\.filter\(x=>x!==cover\)/);
  assert.match(page,/Hình ảnh chi tiết \(\$\{imgs\.length\} ảnh\)/);
  assert.match(page,/ảnh '\+\(i\+1\)/);
  assert.doesNotMatch(page,/ảnh '\+\(i\+2\)/);
});


test("canonical WebP media falls back to an existing AVIF sibling before 404",()=>{
  const media=fs.readFileSync("src/media.js","utf8");
  const start=media.indexOf("let object=await env.MEDIA.get(key)");
  const end=media.indexOf("const access=await privateMediaAccess",start);
  const block=media.slice(start,end);
  assert.match(block,/if\(!object&&\/\\\.webp\$\/i\.test\(key\)\)/);
  assert.match(block,/key\.replace\(\/\\\.webp\$\/i,'\.avif'\)/);
  assert.match(block,/env\.MEDIA\.get\(avifKey\)/);
  assert.ok(block.indexOf("env.MEDIA.get(avifKey)") < block.indexOf('if(!object)return json({ok:false,error:"Not Found"},404)'));
});


test("missing Defender 605-611 media can only self-repair from its exact published Telegram inbox mapping",()=>{
  const media=fs.readFileSync("src/media.js","utf8");
  assert.match(media,/restorePublishedTelegramMedia\(env,key\)/);
  assert.match(media,/telegram-\(60\[5-9\]\|61\[01\]\)-\[a-f0-9\]\{16\}/);
  assert.match(media,/publicMediaReference\(env,key\)/);
  assert.match(media,/WHERE id=\? AND processed_image_url=\? LIMIT 1/);
  assert.match(media,/TELEGRAM_AUTO_BOT_TOKEN\|\|env\.TELEGRAM_BOT_TOKEN/);
  assert.match(media,/storeTelegramVehicleVariants\(env,bytes,prefix\)/);
  assert.doesNotMatch(media,/UPDATE cars SET[\s\S]*restorePublishedTelegramMedia/);
});


test("tg-605 repair session accepts exactly 16 unique source photos and preserves owner price",()=>{
  const router=fs.readFileSync("src/telegram-router.js","utf8");
  assert.match(router,/const carAdd605=\/\^\\\/caradd\\s\+605\\s\*\$\/i\.test\(caption\)/);
  assert.match(router,/vehicle-add:605/);
  assert.match(router,/countBefore>=16/);
  assert.match(router,/rows\.length!==16/);
  assert.match(router,/d\.inbox_id=605/);
  assert.match(router,/source_caption/);
  assert.match(router,/4\\\.879\\\.000\\\.000\|4879000000/);
  assert.doesNotMatch(router,/Number\(ai\.price\)!==4879000000/);
  assert.doesNotMatch(router,/SELECT id,price FROM cars WHERE id='tg-605'/);
  assert.match(router,/DELETE FROM car_images WHERE car_id='tg-605'/);
  assert.match(router,/UPDATE cars SET cover_image=\?,updated_at=CURRENT_TIMESTAMP WHERE id='tg-605'/);
  assert.match(router,/Gallery chỉ thay khi đủ 16 ảnh/);
});
