import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyLeadEmailReceipt} from '../scripts/verify-lead-email-receipt.mjs';
const receipt={lead_id:1,state:'accepted',attempts:1,telegram_message_id:2,telegram_delivery_ok:1,provider_message_id:'<fixture@example.com>'};
test('production gate inspects same-lead receipt without creating another notification',async()=>{
 let calls=0;const result=await verifyLeadEmailReceipt({leadId:1,token:'fixture',wait:async()=>{},fetchImpl:async(_url,options)=>{calls++;assert.equal(options.method,'GET');return Response.json({receipts:[{...receipt,lead_id:9},...(calls>1?[receipt]:[])]});}});
 assert.equal(calls,2);assert.equal(result.lead_id,1);
});
test('production gate fails on ambiguous result and bounds missing receipt polling',async()=>{
 await assert.rejects(verifyLeadEmailReceipt({leadId:1,token:'fixture',fetchImpl:async()=>Response.json({receipts:[{...receipt,state:'uncertain'}]})}),/reconciliation/);
 let calls=0;await assert.rejects(verifyLeadEmailReceipt({leadId:1,token:'fixture',wait:async()=>{},fetchImpl:async()=>{calls++;return Response.json({receipts:[]});}}),/no resend/);assert.equal(calls,12);
});
test('existing public-form gate checks outbox before synthetic cleanup',()=>{
 const source=fs.readFileSync(new URL('../.github/workflows/public-forms-ai-crm-production-e2e.yml',import.meta.url),'utf8');
 assert.ok(source.indexOf('node scripts/verify-lead-email-receipt.mjs')<source.lastIndexOf('          cleanup_lead'));
 assert.match(source,/ref: \$\{\{ github.event.workflow_run.head_sha \}\}/);
});
