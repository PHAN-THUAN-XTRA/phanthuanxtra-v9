import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Jev GitHub cascade is optional, bounded, and non-mutating",()=>{
 const s=fs.readFileSync("scripts/jev-predeploy-decision.mjs","utf8");
 const w=fs.readFileSync(".github/workflows/jev-llm-cascade.yml","utf8");
 assert.match(s,/TYPESAFE_API_KEY not configured/);
 assert.match(s,/jev-latest/);
 assert.match(s,/security_risk>=0\.90/);
 assert.match(s,/production_risk>=0\.90/);
 assert.match(w,/permissions:\n  contents: read/);
 assert.match(w,/persist-credentials: false/);
 assert.match(w,/head -c 120000/);
 assert.doesNotMatch(w,/CLOUDFLARE_API_TOKEN|TELEGRAM_BOT_TOKEN|ADMIN_TOKEN|wrangler/i);
 assert.doesNotMatch(w,/contents: write|pull-requests: write/);
});
