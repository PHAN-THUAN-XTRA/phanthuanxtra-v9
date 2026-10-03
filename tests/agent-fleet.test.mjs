import test from "node:test";
import assert from "node:assert/strict";
import { agentFleet,planAgentRun,fleetEnabled } from "../src/agent-fleet.js";

test("62-agent fleet is complete, unique and governed",()=>{
 const f=agentFleet();
 assert.equal(f.total,62);
 assert.equal(new Set(f.agents.map(a=>a.id)).size,62);
 assert.equal(f.departments.length,8);
 assert.equal(f.departments.reduce((n,d)=>n+d.count,0),62);
 assert.equal(f.policy.orchestrator,"agent-57");
 assert.equal(f.policy.customerDelete,"owner-only");
 assert.match(f.policy.productionDeploy,/Cloudflare API\/SDK/);
});
test("orchestrator routes CRM work through governance and approval",()=>{
 const p=planAgentRun({task:"Khách hỏi xe và cần follow-up CRM"});
 assert.equal(p.ok,true);
 assert.ok(p.departments.includes("crm"));
 assert.ok(p.departments.includes("governance"));
 assert.equal(p.approvalRequired,true);
 assert.equal(p.execution,"plan-only");
 assert.deepEqual(p.pipeline,["collect","score","brief","draft","validate","approval-gate"]);
});
test("kill switch can disable fleet without changing code",()=>{
 assert.equal(fleetEnabled({AI_AGENT_FLEET_ENABLED:"0"}),false);
 assert.equal(fleetEnabled({}),true);
});
