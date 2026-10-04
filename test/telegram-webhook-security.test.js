import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ingest=fs.readFileSync("src/telegram-ingest.js","utf8");
const router=fs.readFileSync("src/telegram-router.js","utf8");
const vip=fs.readFileSync("src/vip-telegram.js","utf8");
const lookup=fs.readFileSync("src/telegram-lookup.js","utf8");

test("production Telegram webhooks fail closed when their secret is missing",()=>{
  assert.match(ingest,/if\(!secret\)return json\(\{error:"Webhook secret is not configured"\},503\)/);
  assert.match(router,/if \(!secret\) return json\(\{ error: "Webhook secret is not configured" \}, 503\)/);
  assert.match(vip,/if\(!secret\)return json\(\{error:"Webhook secret is not configured"\},503\)/);
  assert.match(lookup,/if\(!secret\)return json\(\{error:"Webhook secret is not configured"\},503\)/);
});

test("setWebhook helpers refuse to register without a secret",()=>{
  assert.match(ingest,/throw new Error\("TELEGRAM_WEBHOOK_SECRET is not configured"\)/);
  assert.match(router,/throw new Error\("TELEGRAM_WEBHOOK_SECRET is not configured"\)/);
  assert.match(vip,/throw new Error\("TELEGRAM_VIP_WEBHOOK_SECRET is not configured"\)/);
  assert.match(lookup,/secret_token:secret/);
});

test("Telegram webhook handlers reject mismatched secrets",()=>{
  assert.match(ingest,/X-Telegram-Bot-Api-Secret-Token/);
  assert.match(router,/X-Telegram-Bot-Api-Secret-Token/);
  assert.match(vip,/X-Telegram-Bot-Api-Secret-Token/);
  assert.match(lookup,/X-Telegram-Bot-Api-Secret-Token/);
});
