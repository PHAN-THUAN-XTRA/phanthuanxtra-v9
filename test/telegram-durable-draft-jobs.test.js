import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const router=fs.readFileSync("src/telegram-router.js","utf8");
const entry=fs.readFileSync("src/entry.js","utf8");
const jobs=fs.readFileSync("src/telegram-draft-jobs.js","utf8");

test("Telegram webhook queues vehicle bundles instead of processing the gallery inline",()=>{
  const update=router.slice(router.indexOf("export async function processTelegramUpdate"),router.indexOf("async function autoWebhook"));
  assert.match(update,/bundle_status='queued'/);
  assert.doesNotMatch(update,/await processBundle\(env/);
});

test("durable gallery worker checkpoints only three pending photos per batch",()=>{
  assert.match(jobs,/\.slice\(0,3\)/);
  assert.match(jobs,/status='analyzed',processed_image_url=/);
  assert.match(jobs,/bundle_status='queued'/);
  assert.match(jobs,/bundle_status='done'/);
});

test("scheduled worker reconciles durable Telegram vehicle drafts",()=>{
  assert.match(entry,/reconcileTelegramVehicleDrafts/);
  assert.match(entry,/telegram_vehicle_draft_jobs/);
});

test("stale processing bundles are recovered for retry",()=>{
  assert.match(jobs,/bundle_status='processing'/);
  assert.match(jobs,/datetime\('now','-3 minutes'\)/);
});


test("scheduler drains enough durable batches for a 20+ photo gallery in one invocation",()=>{
  assert.match(jobs,/for\(let batch=0;batch<8;batch\+\+\)/);
  assert.match(jobs,/if\(!result\.claimed\|\|result\.complete\|\|result\.error\)break/);
  assert.match(jobs,/\.slice\(0,3\)/);
});


test("durable gallery uses Workers AI once on the first photo and persists the result",()=>{
  assert.match(jobs,/import \{ analyzeVehicleImage \} from "\.\/vehicle-ai\.js"/);
  assert.match(jobs,/Number\(row\.id\)===Number\(first\.id\)/);
  assert.match(jobs,/await analyzeVehicleImage\(env,bytes/);
  assert.match(jobs,/status='processing'/);
  assert.match(jobs,/SELECT ai_json FROM vehicle_ai_drafts WHERE inbox_id=\?/);
  assert.doesNotMatch(jobs,/deferred_for_durable_gallery/);
});

test("Workers AI failure remains fail-open for durable Telegram publishing",()=>{
  assert.match(jobs,/free_quota_exhausted/);
  assert.match(jobs,/_ai_status:status/);
  assert.match(jobs,/storeTelegramVehicleVariants/);
});


test("Telegram requires preview before vehicle publish",async()=>{
  const router=(await import("node:fs")).readFileSync("src/telegram-router.js","utf8");
  assert.match(router,/\/carpreview\\s\+\(\\d\+\)/);
  assert.match(router,/status='previewed'/);
  assert.match(router,/Phải xem \/carpreview <Inbox ID> trước khi publish/);
  assert.match(router,/Workers AI:/);
  assert.match(router,/ẢNH WEBSITE/);
  assert.match(router,/publish_media_keys/);
});


test("Telegram caption fallback protects approved vehicle publishing",async()=>{
  const fs=await import("node:fs");
  const router=fs.readFileSync("src/telegram-router.js","utf8");
  const ingest=fs.readFileSync("src/telegram-ingest.js","utf8");
  assert.match(router,/captionVehicleFallback/);
  assert.match(router,/_metadata_source="telegram_caption"/);
  assert.match(router,/Thiếu brand\/model có bằng chứng/);
  assert.match(ingest,/vehicle_identity_required/);
});


test("vehicle review persists owner-approved copy and preview uses safe fallback URLs",async()=>{
  const fs=await import("node:fs");
  const router=fs.readFileSync("src/telegram-router.js","utf8");
  assert.match(router,/saveReviewedCarCopy/);
  assert.match(router,/_editorial_status="owner_reviewed"/);
  assert.match(router,/_editorial_source="chatgpt_proposal_owner_approved"/);
  assert.match(router,/captionVehicleFallback\(JSON\.parse\(row\.ai_json/);
  assert.match(router,/key\.split\("\/"\)\.map\(encodeURIComponent\)\.join\("\/"\)/);
  assert.match(router,/\/carreview\\s\+\(\\d\+\)/);
});
