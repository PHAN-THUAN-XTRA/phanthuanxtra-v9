import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReport, deliverReport } from '../scripts/telegram-upgrade-report.mjs';
const report={schema:1,id:'2026-10-03-research',date:'2026-10-03',kind:'research',summary:'Không có nâng cấp đủ giá trị hôm nay.',proposals:[]};
const env={TELEGRAM_BACKUP_BOT_TOKEN:'fake',TELEGRAM_BACKUP_CHAT_ID:'6451516147',TELEGRAM_BACKUP_OWNER_ID:'6451516147'};
test('report preserves Vietnamese and owner-only scope',()=>assert.match(renderReport(report),/Không có nâng cấp/));
test('report rejects extra permissions, excessive proposals and unsafe sources',()=>{
 assert.throws(()=>renderReport({...report,publish:true}));
 assert.throws(()=>renderReport({...report,proposals:[{},{},{},{}]}));
 assert.throws(()=>renderReport({...report,proposals:[{title:'x',benefit:'x',cost:'x',risk:'x',next_step:'x',sources:['http://example.com']}]}));
});
test('delivery denies group and other-user destination before sending',async()=>{
 for(const chat of [{id:6451516147,type:'group'},{id:1,type:'private'}]){
  let calls=0;await assert.rejects(deliverReport(report,env,async()=>{calls++;return Response.json({ok:true,result:chat});}));
  assert.equal(calls,1);
 }
});
test('delivery records only a confirmed owner acknowledgment',async()=>{
 let calls=0;
 const r=await deliverReport(report,env,async()=>Response.json({ok:true,result:++calls===1?{id:6451516147,type:'private'}:{chat:{id:6451516147,type:'private'},message_id:42}}));
 assert.equal(r.message_id,42);assert.equal(r.owner_verified,true);assert.equal(calls,2);
});
test('ambiguous send fails without automatic retry and reruns are blocked',async()=>{
 let calls=0;await assert.rejects(deliverReport(report,env,async()=>{calls++;if(calls===2)throw Error('timeout');return Response.json({ok:true,result:{id:6451516147,type:'private'}});}));
 assert.equal(calls,2);
 await assert.rejects(deliverReport(report,{...env,GITHUB_RUN_ATTEMPT:'2'},async()=>{throw Error('should not send');}));
});
test('existing acknowledgment prevents duplicate Telegram calls',async()=>{
 let calls=0;const r=await deliverReport(report,{...env,GITHUB_TOKEN:'fake',GITHUB_REPOSITORY:'owner/repo'},async()=>{calls++;return Response.json({artifacts:[{name:'upgrade-delivery-'+report.id,expired:false}]});});
 assert.equal(calls,1);assert.equal(r.skipped,true);
});

