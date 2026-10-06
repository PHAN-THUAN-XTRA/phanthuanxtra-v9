import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {classifySecuritySignals,summarizeSecurityEvents,compareTelemetryBaseline} from "../scripts/security-operator.mjs";

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


test("security telemetry baseline stores only aggregate non-IP evidence",()=>{
  const rows=[
    {action:"managed_challenge",clientRequestPath:"/admin",clientCountryName:"US",source:"waf",clientIP:"203.0.113.10"},
    {action:"managed_challenge",clientRequestPath:"/admin",clientCountryName:"US",source:"waf",clientIP:"203.0.113.11"},
    {action:"block",clientRequestPath:"/api",clientCountryName:"SG",source:"rateLimit",clientIP:"203.0.113.12"}
  ];
  const summary=summarizeSecurityEvents(rows);
  assert.equal(summary.eventCount,3);
  assert.deepEqual(summary.topPaths[0],{value:"/admin",count:2});
  assert.deepEqual(summary.topCountries[0],{value:"US",count:2});
  assert.equal(JSON.stringify(summary).includes("203.0.113"),false);
  const migration=fs.readFileSync("migrations/0036_security_telemetry_baseline.sql","utf8");
  assert.match(migration,/security_telemetry_samples/);
  assert.doesNotMatch(migration,/client_ip|user_agent/i);
});

test("telemetry baseline becomes ready after six samples and computes ratios",()=>{
  const b=compareTelemetryBaseline(
    {wafEvents:12,errorRate:3.5},
    {sample_count:8,avg_total_requests:100,avg_waf_events:3,avg_error_rate:1.25}
  );
  assert.equal(b.ready,true);
  assert.equal(b.waf_ratio,4);
  assert.equal(b.error_rate_delta,2.25);
});

test("security workflows use current Node 24 action majors for artifact paths",()=>{
  const monitor=fs.readFileSync(".github/workflows/free-security-operator.yml","utf8");
  const investigator=fs.readFileSync(".github/workflows/security-incident-investigator.yml","utf8");
  assert.match(monitor,/actions\/checkout@v7/);
  assert.match(monitor,/actions\/setup-node@v7/);
  assert.match(monitor,/actions\/upload-artifact@v7/);
  assert.doesNotMatch(monitor,/actions\/upload-artifact@v4/);
  assert.match(investigator,/actions\/checkout@v7/);
  assert.match(investigator,/actions\/setup-node@v7/);
  assert.match(investigator,/actions\/download-artifact@v8/);
  assert.match(investigator,/actions\/upload-artifact@v7/);
});


test("Cloudflare link maze injections stay visible but do not count as actionable WAF attacks",()=>{
  const rows=[
    ...Array.from({length:122},()=>({action:"link_maze_injected",clientRequestPath:"/",clientCountryName:"US",source:"linkMaze"})),
    {action:"managed_challenge",clientRequestPath:"/admin",clientCountryName:"VN",source:"waf"}
  ];
  const summary=summarizeSecurityEvents(rows);
  assert.equal(summary.rawEventCount,123);
  assert.equal(summary.excludedEventCount,122);
  assert.equal(summary.eventCount,1);
  assert.deepEqual(summary.topActions[0],{value:"managed_challenge",count:1});
  assert.deepEqual(summary.excludedTopActions[0],{value:"link_maze_injected",count:122});
  const classification=classifySecuritySignals({
    healthOk:true,homeOk:true,analyticsOk:true,wafTelemetryOk:true,
    totalRequests:204,error5xx:1,wafEvents:summary.eventCount
  });
  assert.ok(!classification.findings.some(x=>x.key.startsWith("waf-spike-")));
  const cleanup=fs.readFileSync("migrations/0037_security_baseline_linkmaze_cleanup.sql","utf8");
  assert.match(cleanup,/linkMaze/);
  assert.match(cleanup,/link_maze_injected/);
});
