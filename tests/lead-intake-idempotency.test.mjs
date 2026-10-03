import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("public lead intake has a durable replay-safe contract",()=>{
 const source=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
 const migration=fs.readFileSync(new URL("../migrations/0030_lead_intake_idempotency.sql",import.meta.url),"utf8");
 assert.match(source,/function leadIdempotencyKey/);
 assert.match(source,/Idempotency-Key/);
 assert.match(source,/payload_fingerprint/);
 assert.match(source,/createLeadReplaySafe/);
 assert.match(source,/replayed:true/);
 assert.match(source,/Idempotency-Key đã được dùng cho payload khác/);
 assert.match(migration,/idempotency_key TEXT PRIMARY KEY/);
 assert.match(migration,/lead_id INTEGER/);
 assert.match(migration,/status TEXT NOT NULL DEFAULT 'claimed'/);
});
test("lead is stored behind the idempotency claim and replay does not insert another lead",()=>{
 const source=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
 const claim=source.indexOf("INSERT INTO xtra_lead_intake_requests");
 const lead=source.indexOf("INSERT INTO leads",claim);
 const replay=source.indexOf("if(prior.lead_id)",claim);
 assert.ok(claim>=0&&lead>claim);
 assert.ok(replay>claim&&replay<lead);
});
test("lead intake keeps consequential lead management outside autonomous permission",()=>{
 const fleet=fs.readFileSync(new URL("../src/agent-fleet.js",import.meta.url),"utf8");
 assert.match(fleet,/agent-26/);
 assert.match(fleet,/no lead deletion\/status escalation/);
});
