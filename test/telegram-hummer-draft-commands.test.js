import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { captionVehicleFallback, telegramWebhookReceipt } from "../src/telegram-router.js";

const router=fs.readFileSync("src/telegram-router.js","utf8");
const draftJobs=fs.readFileSync("src/telegram-draft-jobs.js","utf8");

test("HUMMER H2 Luxury can be previewed with owner price when optional vision is unavailable",()=>{
  const caption="🔥 HUMMER H2 LUXURY 2009 – BIỂU TƯỢNG SỨC MẠNH\n• Model: 2009\nGiá 2.600 tỷ";
  const ai=captionVehicleFallback({confidence:0,description:caption},caption);
  assert.equal(ai.brand,"HUMMER");
  assert.equal(ai.model,"H2 LUXURY");
  assert.equal(ai.year,2009);
  assert.equal(ai.price,2600000000);
  assert.equal(ai.description,caption);
  assert.equal(ai.mileage,undefined);
});

test("owner-supplied Vietnamese billion price takes precedence over optional guessed price",()=>{
  const ai=captionVehicleFallback({brand:"HUMMER",model:"H2",price:0}, "HUMMER H2\nGiá: 2,6 tỷ");
  assert.equal(ai.price,2600000000);
});

test("missing /carpreview ID uses latest pending draft for the authorized chat",()=>{
  assert.match(router,/const carPreviewWithoutId=/);
  assert.match(router,/latestReviewCarInbox\(env,chatId\)/);
  assert.match(router,/d\.status IN \('awaiting_review','previewed'\)/);
  assert.match(router,/i\.chat_id=\?/);
  assert.match(router,/await previewReviewedCar\(env,chatId,inboxId\)/);
});

test("missing /carpublish ID only gives an explicit confirmation command and never publishes",()=>{
  const start=router.indexOf("const carPublishWithoutId=");
  const end=router.indexOf("const carPublish=/",start);
  assert.ok(start>0&&end>start);
  const block=router.slice(start,end);
  assert.match(block,/\/carpublish \$/);
  assert.doesNotMatch(block,/publishReviewedCar\(/);
  assert.doesNotMatch(block,/promoteDraft\(/);
});

test("Telegram text acknowledgement does not falsely ask to resend an already stored album",()=>{
  const receipt=telegramWebhookReceipt(false);
  assert.match(receipt,/ĐÃ NHẬN THÔNG TIN XE/);
  assert.match(receipt,/không cần gửi lại/);
  assert.match(draftJobs,/Dùng \/carpreview/);
  assert.match(draftJobs,/sau đó \/carpublish/);
});
