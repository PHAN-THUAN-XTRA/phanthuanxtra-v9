import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/telegram-media-variants.js","utf8");

test("Cloudflare Images output is awaited before response()",()=>{
  assert.match(source,/const output=await env\.IMAGES\.input/);
  assert.match(source,/\.output\(\{format,quality\}\);/);
  assert.match(source,/const response=output\.response\(\);/);
  assert.doesNotMatch(source,/\.output\(\{format,quality\}\)\.response\(\)/);
});
