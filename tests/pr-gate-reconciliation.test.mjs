import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('live Content Runner remains disabled in production config and contract is owner gated',async()=>{
 const cfg=JSON.parse(read('../wrangler.json'));
 const {contentRunnerContract}=await import('../src/content-runner-contract.js');
 const c=contentRunnerContract();
 assert.equal(cfg.vars.CONTENT_RUNNER_LIVE_ENABLED,'0');
 assert.equal(c.publicPublish,false);assert.equal(c.autoPublish,false);
 assert.equal(c.requires_owner_approval,true);
 assert.deepEqual([c.limits.callsPerRun,c.limits.callsPerDay,c.limits.maxTokens],[3,12,1200]);
});
test('CI offline fixture runs with no live AI, private draft and approval gate',()=>{
 const ci=read('../.github/workflows/ci.yml');
 assert.match(ci,/Content Runner offline safety acceptance/);
 assert.match(ci,/scripts\/simulate-content-runner\.mjs/);
 assert.match(ci,/json\.real_ai_calls!==0/);
 assert.match(ci,/json\.pending_publication_jobs!==0/);
 assert.match(ci,/config\.vars\?\.CONTENT_RUNNER_LIVE_ENABLED/);
});
test('production smoke monitors hidden owner cars via public GET only',()=>{
 const smoke=read('../.github/workflows/production-smoke-gate15.yml');
 const gate=smoke.slice(smoke.indexOf('      - name: Verify hidden owner vehicles'),smoke.indexOf('      - name: Compare editorial provenance'));
 assert.ok(gate.length>200);
 assert.match(gate,/tg-756/);assert.match(gate,/tg-527/);
 assert.match(gate,/\.source == "d1"/);assert.match(gate,/test "\$status" = "404"/);
 assert.doesNotMatch(gate,/\bPOST\b|\bPUT\b|\bDELETE\b|\/api\/admin\//);
});
test('MASTER preserves the complete acceptance archive without an extra Markdown file',()=>{
 const m=read('../MASTER_PROJECT_STATUS.md');
 assert.equal(m.split('# PHAN THUẦN XTRA — MASTER PROJECT STATUS').length-1,1);
 assert.equal(fs.existsSync(new URL('../docs/PR_GATE_RECONCILIATION_2026-10-13.md',import.meta.url)),false);
 const archived=m.split('<!-- BEGIN ARCHIVED PR GATE 2026-10-13 -->\n')[1]?.split('<!-- END ARCHIVED PR GATE 2026-10-13 -->')[0];
 assert.ok(archived);
 assert.equal(createHash('sha256').update(archived).digest('hex'),'cd1c546de40530aead27023f840cb9b7f88905cb2013ca164586eccb72240ae4');
 assert.match(m,/#archived-pr-gate-reconciliation-2026-10-13/);
});
