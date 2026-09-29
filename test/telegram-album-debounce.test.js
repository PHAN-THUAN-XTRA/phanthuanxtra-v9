import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/telegram-router.js","utf8");

test("Telegram album webhook suppresses per-item immediate receipts",()=>{
  const webhook=source.slice(source.indexOf("async function autoWebhook"),source.indexOf("export async function getAutoTelegramWebhookStatus"));
  assert.match(webhook,/if\(!message\.media_group_id\)/);
  assert.match(webhook,/Album items are acknowledged once/);
});

test("Telegram media_group waits for quiet period and only latest item processes bundle",()=>{
  const handler=source.slice(source.indexOf("export async function processTelegramUpdate"),source.indexOf("async function autoWebhook"));
  assert.match(handler,/if\(mediaGroupId\)/);
  assert.match(handler,/await sleep\(2200\)/);
  assert.match(handler,/ORDER BY id DESC LIMIT 1/);
  assert.match(handler,/Number\(latest\?\.message_id\|\|0\)!==Number\(message\.message_id\|\|0\)/);
  assert.match(handler,/ĐÃ NHẬN ALBUM XE/);
  assert.match(handler,/await processBundle\(env,bundleKey,chatId\)/);
});

test("album processor does not emit legacy per-photo waiting receipt",()=>{
  const album=source.slice(source.indexOf("if(mediaGroupId){"),source.indexOf("const rows = (await env.DB.prepare",source.indexOf("if(mediaGroupId){")));
  assert.doesNotMatch(album,/Đã nhận ảnh\. Chờ phần thông tin/);
  assert.doesNotMatch(album,/telegramWebhookReceipt/);
});
