import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const router=fs.readFileSync("src/telegram-router.js","utf8");
const variants=fs.readFileSync("src/telegram-media-variants.js","utf8");
const ingest=fs.readFileSync("src/telegram-ingest.js","utf8");

test("Telegram car album stores AVIF and WebP format-only variants",()=>{
  assert.match(variants,/output\(\{format,quality\}\)/);
  assert.match(variants,/"image\/avif",76/);
  assert.match(variants,/"image\/webp",82/);
  assert.match(variants,/processing:"format-only"/);
  assert.match(router,/storeTelegramVehicleVariants/);
  const bundle=router.slice(router.indexOf("async function processBundle"),router.indexOf("function blogCommand"));
  assert.doesNotMatch(bundle,/createPtXtraPlateImage|preparePrivateCover|storePublishingImage/);
});

test("Telegram car intake never auto-publishes and requires explicit approval",()=>{
  const bundle=router.slice(router.indexOf("async function processBundle"),router.indexOf("function blogCommand"));
  assert.match(bundle,/status='awaiting_review'/);
  assert.match(bundle,/Chưa đăng website/);
  assert.doesNotMatch(bundle,/canAutoPublish|ĐÃ PHÂN TÍCH \+ TỰ ĐĂNG XE/);
  assert.match(router,/\/carpublish\\s\+\(\\d\+\)/);
  assert.match(router,/String\(row\.chat_id\)!==String\(chatId\)/);
  assert.match(router,/promoteDraft\(env,Number\(inboxId\),ai,keys\[0\],keys,true\)/);
});

test("human approval bypass is explicit and automatic promotion remains confidence gated",()=>{
  assert.match(ingest,/if\(!approved&&!canAutoPublish\(ai\)\)/);
  assert.match(ingest,/approved=false/);
});


test("vehicle draft dedupes repeated Telegram album captions",()=>{
  const bundle=router.slice(router.indexOf("async function processBundle"),router.indexOf("function blogCommand"));
  assert.match(bundle,/new Set\(rows\.map\(row => clean\(row\.caption, 10000\)\)\.filter\(Boolean\)\)/);
});

test("Defender caption fallback supplies LAND ROVER brand for publish gate",()=>{
  const fallback=router.slice(router.indexOf("function captionVehicleFallback"),router.indexOf("async function publishReviewedCar"));
  assert.match(fallback,/DEFENDER/);
  assert.match(fallback,/next\.brand="LAND ROVER"/);
});


test("Defender 605 preview trims duplicated persisted copy at first owner price marker",()=>{
  const preview=router.slice(router.indexOf("async function previewReviewedCar"),router.indexOf("async function openTg444Supplement"));
  assert.match(preview,/inboxId===605&&firstPriceEnd>0/);
  assert.match(preview,/rawDescription\.slice\(0,firstPriceEnd\)/);
});
