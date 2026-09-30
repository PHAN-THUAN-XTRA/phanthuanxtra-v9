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
