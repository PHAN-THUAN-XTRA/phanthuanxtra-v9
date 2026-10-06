import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {planRemediation} from "../scripts/incident-investigator.mjs";

test("critical recent code incident can produce draft revert candidate",()=>{
  const report={findings:[{key:"homepage-down",severity:"critical"}]};
  const commit={sha:"a".repeat(40),age_minutes:10,parentCount:1,changed:["src/entry.js","test/example.test.js"]};
  const p=planRemediation(report,commit);
  assert.equal(p.candidate,true);
  assert.equal(p.kind,"draft-revert-latest-main");
  assert.match(p.branch,/^incident\/revert-/);
});

test("WAF-only attack signal never creates code revert PR",()=>{
  const report={findings:[{key:"waf-spike-critical",severity:"critical"}]};
  const commit={sha:"b".repeat(40),age_minutes:5,parentCount:1,changed:["src/entry.js"]};
  const p=planRemediation(report,commit);
  assert.equal(p.candidate,false);
  assert.ok(p.reasons.includes("no_code_runtime_signal"));
});

test("migration or deployment changes block automatic revert candidate",()=>{
  const report={findings:[{key:"health-endpoint-down",severity:"critical"}]};
  for(const file of ["migrations/0040.sql","wrangler.json","scripts/deploy-cloudflare-api.mjs",".github/workflows/deploy-cloudflare.yml"]){
    const p=planRemediation(report,{sha:"c".repeat(40),age_minutes:10,parentCount:1,changed:[file]});
    assert.equal(p.candidate,false,file);
    assert.ok(p.reasons.includes("latest_commit_touches_high_risk_paths"));
  }
});

test("old or high-severity-only incident remains report only",()=>{
  assert.equal(planRemediation({findings:[{key:"worker-5xx-high",severity:"high"}]},{sha:"d".repeat(40),age_minutes:5,parentCount:1,changed:["src/index.js"]}).candidate,false);
  assert.equal(planRemediation({findings:[{key:"homepage-down",severity:"critical"}]},{sha:"e".repeat(40),age_minutes:120,parentCount:1,changed:["src/index.js"]}).candidate,false);
});

test("Phase 2 workflow never auto-merges or invokes production rollback",()=>{
  const yml=fs.readFileSync(".github/workflows/free-security-operator.yml","utf8");
  assert.match(yml,/gh pr create --draft/);
  assert.match(yml,/git revert --no-edit/);
  assert.doesNotMatch(yml,/gh pr merge/);
  assert.doesNotMatch(yml,/deploy-cloudflare-api\.mjs/);
  assert.doesNotMatch(yml,/production\/rollback/);
  assert.match(yml,/cron: "\*\/30 \* \* \* \*"/);
});
