import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/telegram-router.js","utf8");
const bundle=source.slice(source.indexOf("async function processBundle"),source.indexOf("function blogCommand"));

test("Telegram galleries use bounded batches of three",()=>{
  assert.match(bundle,/offset<photoRows\.length; offset\+=3/);
  assert.match(bundle,/photoRows\.slice\(offset,offset\+3\)/);
  assert.match(bundle,/Promise\.all\(batch\.map/);
});

test("only the first gallery image may run vehicle Vision",()=>{
  assert.match(bundle,/if \(index === 0\)/);
  assert.equal((bundle.match(/analyzeVehicleImage\(env, bytes, contentType, text\)/g)||[]).length,1);
});

test("bounded concurrency preserves ordered gallery results",()=>{
  assert.match(bundle,/processed\.push\(\.\.\.results\)/);
});
