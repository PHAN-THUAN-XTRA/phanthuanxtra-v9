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
  assert.match(workflow,/cron: "\*\/30 \* \* \* \*"/);
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


test("security operator surfaces missing analytics telemetry as HIGH",()=>{
  const r=classifySecuritySignals({healthOk:true,homeOk:true,analyticsOk:false,analyticsError:"Cloudflare API token does not have Zone Analytics Read"});
  assert.ok(r.findings.some(x=>x.key==="security-telemetry-unavailable"&&x.severity==="high"));
});

test("security analytics path tries configured tokens and avoids secret identifiers in owner guidance",()=>{
  const source=fs.readFileSync("scripts/security-operator.mjs","utf8");
  assert.match(source,/for\(const \[name,token\] of TOKENS\)/);
  assert.match(source,/sanitizeAnalyticsError/);
  assert.match(source,/Zone Analytics Read/);
  assert.match(source,/INTERVAL_MINUTES=30/);
});


test("security operator isolates HTTP analytics from WAF dataset access",()=>{
  const source=fs.readFileSync("scripts/security-operator.mjs","utf8");
  assert.match(source,/httpRequestsAdaptiveGroups/);
  assert.match(source,/firewallEventsAdaptive\(/);
  assert.doesNotMatch(source,/firewallEventsAdaptiveGroups/);
  assert.match(source,/wafTelemetryOk/);
  assert.match(source,/waf_telemetry_ok/);
});

test("security operator reports WAF telemetry loss without hiding working HTTP analytics",()=>{
  const r=classifySecuritySignals({
    healthOk:true,homeOk:true,analyticsOk:true,wafTelemetryOk:false,
    wafTelemetryError:"Security Events dataset denied",totalRequests:100,error5xx:0,wafEvents:0
  });
  assert.ok(r.findings.some(x=>x.key==="waf-telemetry-unavailable"&&x.severity==="high"));
  assert.ok(!r.findings.some(x=>x.key==="security-telemetry-unavailable"));
});
