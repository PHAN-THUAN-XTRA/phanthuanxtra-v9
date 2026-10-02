import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { vehicleDraftJob, enqueueTelegramVehicleDraft } from "../src/telegram-draft-jobs.js";

test("vehicle Queue payload is compact and versioned",()=>{
  const job=vehicleDraftJob("chat:vehicle-session:123","42",777);
  assert.equal(job.type,"telegram_vehicle_draft");
  assert.equal(job.version,1);
  assert.equal(job.bundle_key,"chat:vehicle-session:123");
  assert.equal(job.chat_id,"42");
  assert.equal(job.inbox_id,777);
  assert.ok(job.queued_at);
  assert.ok(Buffer.byteLength(JSON.stringify(job))<1024);
});

test("enqueueTelegramVehicleDraft sends JSON through VEHICLE_JOBS binding",async()=>{
  let seen=null;
  const env={VEHICLE_JOBS:{async send(body,options){seen={body,options};return {ok:true};}}};
  await enqueueTelegramVehicleDraft(env,{bundle_key:"b1",chat_id:"99",inbox_id:5});
  assert.equal(seen.body.bundle_key,"b1");
  assert.equal(seen.body.chat_id,"99");
  assert.equal(seen.body.inbox_id,5);
  assert.deepEqual(seen.options,{contentType:"json"});
});

test("deployment controller provisions producer consumer DLQ with fail-closed verification",()=>{
  const source=fs.readFileSync("scripts/deploy-cloudflare-api.mjs","utf8");
  for(const marker of [
    'const VEHICLE_QUEUE = "ptx-vehicle-jobs"',
    'const VEHICLE_DLQ = "ptx-vehicle-jobs-dlq"',
    'name: "VEHICLE_JOBS", type: "queue", queue_name: VEHICLE_QUEUE',
    'dead_letter_queue: VEHICLE_DLQ',
    'batch_size: 1',
    'max_retries: 5',
    'ensureVehicleQueueResources()',
    'ensureVehicleQueueConsumer(vehicleQueues.primary)',
    'verifyVehicleQueueDeployment(vehicleQueues.primary)'
  ]) assert.ok(source.includes(marker),marker);
});

test("wrangler documents vehicle Queue producer consumer and DLQ",()=>{
  const cfg=JSON.parse(fs.readFileSync("wrangler.json","utf8"));
  assert.deepEqual(cfg.queues?.producers,[{binding:"VEHICLE_JOBS",queue:"ptx-vehicle-jobs"}]);
  assert.equal(cfg.queues?.consumers?.[0]?.queue,"ptx-vehicle-jobs");
  assert.equal(cfg.queues?.consumers?.[0]?.dead_letter_queue,"ptx-vehicle-jobs-dlq");
  assert.equal(cfg.queues?.consumers?.[0]?.max_batch_size,1);
  assert.equal(cfg.queues?.consumers?.[0]?.max_retries,5);
});
