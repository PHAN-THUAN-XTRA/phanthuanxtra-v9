import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Windows completion gate preserves safe ordered workflow",()=>{
  const s=fs.readFileSync("scripts/complete-local-gates.ps1","utf8");
  const fetch=s.indexOf("git fetch origin --prune");
  const pull=s.indexOf("git pull --ff-only origin main");
  const check=s.indexOf("agent-reach.ps1 -Mode Check");
  const install=s.indexOf("agent-reach.ps1 -Mode Install");
  const doctor=s.indexOf("doctor --json");
  assert.ok(fetch>=0 && pull>fetch && check>pull && install>check && doctor>install);
  assert.doesNotMatch(s,/reset --hard|git clean|--system/);
});
