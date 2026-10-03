import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ps=fs.readFileSync("scripts/agent-reach.ps1","utf8");
const doc=fs.readFileSync("MASTER_PROJECT_STATUS.md","utf8");

test("Agent-Reach integration is pinned and safe by default",()=>{
  assert.match(ps,/a19a171fa980a0785849596492e0af4db800c82f/);
  assert.match(ps,/ValidateSet\("Check","Install"\)/);
  assert.match(ps,/install --env=local/);
  assert.doesNotMatch(ps,/install[^\r\n]*--system/);
  assert.doesNotMatch(ps,/cookie|token/i);
  assert.match(doc,/not part of the Cloudflare Worker runtime/);
  assert.match(doc,/Do not vendor or execute moving/);
  assert.match(doc,/No social posting\/write automation/);
});
