import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Termux-first completion gate is pinned and non-destructive",()=>{
  const s=fs.readFileSync("scripts/complete-termux-gates.sh","utf8");
  assert.match(s,/git pull --ff-only origin main/);
  assert.match(s,/a19a171fa980a0785849596492e0af4db800c82f/);
  assert.match(s,/agent-reach" doctor --json/);
  assert.doesNotMatch(s,/wrangler/i);
  assert.doesNotMatch(s,/reset --hard|git clean|--system/);
});
