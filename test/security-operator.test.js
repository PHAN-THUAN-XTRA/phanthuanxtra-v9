import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {classifySecuritySignals} from "../scripts/security-operator.mjs";

test("security operator escalates only meaningful failure thresholds",()=>{
  assert.equal(classifySecuritySignals({healthOk:true,homeOk:true,totalRequests:100,error5xx:2,wafEvents:20}).findings.length,0);
  const high=classifySecuritySignals({healthOk:true,homeOk:true,totalRequests:200,error5xx:12,wafEvents:150}).findings;
  assert.ok(high.some(x=>x.key==="worker-5xx-high"&&x.severity==="high"));
  assert.ok(high.some(x=>x.key==="waf-spike-high"&&x.severity==="high"));
  const critical=classifySecuritySignals({healthOk:false,homeOk:false,totalRequests:200,error5xx:30,wafEvents:700}).findings;
  assert.ok(critical.filter(x=>x.severity==="critical").length>=4);
});

test("security operator is free-first and approval-gates dangerous remediation",()=>{
  const source=fs.readFileSync("scripts/security-operator.mjs","utf8");
  const workflow=fs.readFileSync(".github/workflows/free-security-operator.yml","utf8");
  assert.match(workflow,/cron: "\*\/15 \* \* \* \*"/);
  assert.match(source,/approval_required/);
  assert.match(source,/production rollback/);
  assert.match(source,/Under Attack Mode/);
  assert.doesNotMatch(source,/AI\.run\(/);
  assert.doesNotMatch(source,/OPENAI_API_KEY/);
});

test("security operator persists dedupe state in migration and owner Telegram",()=>{
  const migration=fs.readFileSync("migrations/0035_security_operator.sql","utf8");
  const source=fs.readFileSync("scripts/security-operator.mjs","utf8");
  assert.match(migration,/CREATE TABLE IF NOT EXISTS security_operator_state/);
  assert.match(source,/last_notified_at/);
  assert.match(source,/verifyOwnerChat/);
  assert.match(source,/6/);
});
