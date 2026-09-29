import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync("src/ai-chat.js","utf8");
test("AI fallback order conserves daily inference budget",()=>{const n=source.indexOf("@cf/nvidia/nemotron-3-120b-a12b");const q=source.indexOf("@cf/qwen/qwen3.8-27b");assert.ok(n>0&&q>n);});
test("AI response token budget remains bounded",()=>{assert.match(source,/const MAX_OUTPUT_TOKENS = 350;/);});
