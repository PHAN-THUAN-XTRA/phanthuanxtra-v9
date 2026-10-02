import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const router=fs.readFileSync("src/telegram-router.js","utf8");
const entry=fs.readFileSync("src/entry.js","utf8");
const jobs=fs.readFileSync("src/telegram-draft-jobs.js","utf8");

test("ordinary Telegram intake queues vehicle bundles instead of processing galleries inline",()=>{
  const update=router.slice(router.indexOf("export async function processTelegramUpdate"),router.indexOf("async function autoWebhook"));
  const ordinaryIntake=update.slice(update.indexOf("if(mediaGroupId){"));
  assert.match(ordinaryIntake,/bundle_status='queued'/);
  assert.doesNotMatch(ordinaryIntake,/await processBundle\(env/);
});

test("durable gallery worker checkpoints only three pending photos per batch",()=>{
  assert.match(jobs,/\.slice\(0,3\)/);
  assert.match(jobs,/status='analyzed',processed_image_url=/);
  assert.match(jobs,/bundle_status='queued'/);
  assert.match(jobs,/bundle_status='done'/);
});

test("Worker exposes both Queue consumer and cron recovery for durable Telegram vehicle drafts",()=>{
  assert.match(entry,/consumeTelegramVehicleDraftJobs/);
  assert.match(entry,/async queue\(batch, env, ctx\)/);
  assert.match(entry,/reconcileTelegramVehicleDrafts/);
  assert.match(entry,/telegram_vehicle_draft_jobs/);
});

test("stale processing bundles are recovered for retry",()=>{
  assert.match(jobs,/bundle_status='processing'/);
  assert.match(jobs,/datetime\('now','-3 minutes'\)/);
});


test("Queue consumer checkpoints three photos then chains a continuation message",()=>{
  assert.match(jobs,/processTelegramVehicleDraftBatch/);
  assert.match(jobs,/\.slice\(0,3\)/);
  assert.match(jobs,/enqueueTelegramVehicleDraft\(env/);
  assert.match(jobs,/message\.ack/);
  assert.match(jobs,/message\.retry/);
});

test("cron recovery re-enqueues only stale clean D1 jobs when Queue is available",()=>{
  assert.match(jobs,/mode:"queue-recovery"/);
  assert.match(jobs,/updated_at < datetime\('now','-2 minutes'\)/);
  assert.match(jobs,/error IS NULL OR error=''/);
  assert.match(jobs,/VEHICLE_JOBS/);
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
