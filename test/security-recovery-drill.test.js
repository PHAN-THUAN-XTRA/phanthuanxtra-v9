import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {runRecoveryDrill} from "../scripts/security-recovery-drill.mjs";

test("recovery drill is synthetic and preserves production safety gates",async()=>{
  const original=process.env.SECURITY_RECOVERY_DRILL_REPORT;
  process.env.SECURITY_RECOVERY_DRILL_REPORT="/tmp/security-recovery-drill-test.json";
  try{
    const report=await runRecoveryDrill();
    assert.equal(report.checks.length,5);
    assert.ok(report.checks.every(x=>x.ok===true));
    assert.equal(report.policy.secrets_used,false);
    assert.equal(report.policy.production_network_called,false);
    assert.equal(report.policy.firewall_mutation,false);
    assert.equal(report.policy.production_deploy,false);
  }finally{
    if(original===undefined)delete process.env.SECURITY_RECOVERY_DRILL_REPORT;
    else process.env.SECURITY_RECOVERY_DRILL_REPORT=original;
  }
});

test("recovery drill workflow is read-only and uses Node 24 action majors",()=>{
  const workflow=fs.readFileSync(".github/workflows/security-recovery-drill.yml","utf8");
  assert.match(workflow,/contents: read/);
  assert.match(workflow,/actions\/checkout@v7/);
  assert.match(workflow,/actions\/setup-node@v7/);
  assert.match(workflow,/actions\/upload-artifact@v7/);
  assert.doesNotMatch(workflow,/secrets\./);
  assert.doesNotMatch(workflow,/gh pr create|git revert|deploy-cloudflare-api|wrangler deploy|firewall/i);
});
