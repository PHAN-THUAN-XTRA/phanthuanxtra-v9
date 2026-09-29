import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/telegram-router.js","utf8");
const bundle=source.slice(source.indexOf("async function processBundle"),source.indexOf("function blogCommand"));

test("Telegram gallery runs optional vehicle Vision at most once per bundle",()=>{
  assert.match(bundle,/if \(index === 0\)/);
  assert.equal((bundle.match(/analyzeVehicleImage\(env, bytes, contentType, text\)/g)||[]).length,1);
});

test("Workers AI quota exhaustion does not abort AVIF WebP R2 draft creation",()=>{
  assert.match(bundle,/catch \(error\) \{/);
  assert.match(bundle,/_ai_status: \/daily allocation exhausted\|quota\/i/);
  assert.match(bundle,/storeTelegramVehicleVariants/);
  assert.match(bundle,/Workers AI hết quota Free; draft vẫn được tạo từ nội dung Telegram/);
});
