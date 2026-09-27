import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ingest=fs.readFileSync("src/telegram-ingest.js","utf8");
const plate=fs.readFileSync("src/plate-branding.js","utf8");
const pipeline=fs.readFileSync("src/media-pipeline.js","utf8");

test("Telegram vehicle media is normalized to WebP before R2 publication",()=>{
  assert.match(ingest,/prepareVehicleWebp/);
  assert.match(ingest,/"vehicles\\/inbox-"\\+inboxId\\+"-"\\+sourceHash\\.slice\\(0,16\\)\\+"\\.webp"/);
  assert.match(ingest,/contentType:"image\/webp"/);
  assert.doesNotMatch(ingest,/publish-inbox-\$\{inboxId\}-\$\{sourceHash\.slice\(0,16\)\}\.jpg/);
  assert.match(plate,/output\(\{ format: "image\/webp"/);
  assert.match(pipeline,/output\(\{format:"image\/webp"/);
});

test("Detected license plates use privacy-safe transformed publish media",()=>{
  assert.match(ingest,/hasValidPlateBox\(ai\?\.plate_bbox\)/);
  assert.match(ingest,/createPtXtraPlateImage\(env,bytes,contentType,ai\.plate_bbox,publishMediaKey\)/);
  assert.match(plate,/metadata: "none"/);
});


test("Telegram ingestion keeps atomic exactly-once claim semantics",()=>{
  assert.match(ingest,/status='processing'.*status='received'/);
  assert.match(ingest,/if\(!\(await claimInbox\(env,inboxId\)\)\) return/);
  assert.match(ingest,/ON CONFLICT\(inbox_id\) DO UPDATE/);
});
