import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowNotice,checkPublicSite,healthNotice,sendOwnerNotice} from '../scripts/production-owner-alert.mjs';
const repo='PHAN-THUAN-XTRA/phanthuanxtra-v9';
const env={GITHUB_REPOSITORY:repo,GITHUB_TOKEN:'fixture',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40),TELEGRAM_BACKUP_BOT_TOKEN:'fixture',TELEGRAM_BACKUP_CHAT_ID:'6451516147'};
const run={id:456,run_attempt:1,name:'Deploy Cloudflare Worker',head_branch:'main',head_sha:'a'.repeat(40),status:'completed',conclusion:'success',event:'push',repository:{full_name:repo},head_repository:{full_name:repo}};
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
const notice={key:'workflow-456-1',text:'Test deployment',source_sha:env.GITHUB_SHA};
test('only main production events produce notices; PRs and forks denied',()=>{
  assert.match(workflowNotice({workflow_run:run},env).text,/DEPLOY THÀNH CÔNG/);
  for(const patch of [{event:'pull_request'},{head_branch:'other'},{head_repository:{full_name:'other/repo'}},{status:'in_progress'},{conclusion:'skipped'},{name:'untrusted'}]) {
    assert.equal(workflowNotice({workflow_run:{...run,...patch}},env),null);
  }
  assert.equal(workflowNotice({workflow_run:run},{...env,GITHUB_REPOSITORY:'other/repo'}),null);
});
test('gate failures alert; gate success stays quiet; deployment attempts are distinct',()=>{
  const gate={...run,name:'Production Smoke Gate-15',event:'workflow_run'};
  assert.equal(workflowNotice({workflow_run:gate},env),null);
  assert.match(workflowNotice({workflow_run:{...gate,conclusion:'failure'}},env).text,/CẦN KIỂM TRA/);
  assert.notEqual(workflowNotice({workflow_run:run},env).key,workflowNotice({workflow_run:{...run,run_attempt:2}},env).key);
});
test('health requires real homepage and healthy D1 catalog, allows an empty catalog',async()=>{
  const result=await checkPublicSite(async url=>url.endsWith('/api/health')?json({ok:true}):url.endsWith('/api/cars')?json({source:'d1',cars:[]}):new Response('PHAN THUẦN XTRA',{headers:{'content-type':'text/html; charset=utf-8'}}));
  assert.equal(result.ok,true);
});
test('health retries each failed endpoint once, rejects HTML API/error data and never exposes body',async()=>{
  let calls=0;
  const result=await checkPublicSite(async()=>{calls++;return new Response('secret-body',{headers:{'content-type':'text/html'}});});
  assert.equal(calls,6); assert.equal(result.ok,false); assert.doesNotMatch(JSON.stringify(result),/secret-body/);
  const timeout=await checkPublicSite(async()=>{throw Error('private transport details');});
  assert.ok(timeout.checks.every(c=>!c.ok&&c.status===0));
});
test('scheduled healthy check stays quiet; failure dedup uses Vietnam date',()=>{
  const health={ok:true,checks:[{path:'/',ok:true,status:200}]};
  assert.equal(healthNotice(health,{...env,GITHUB_EVENT_NAME:'schedule'}),null);
  assert.match(healthNotice(health,{...env,GITHUB_EVENT_NAME:'push'}).text,/Đã bật/);
  assert.equal(healthNotice({...health,ok:false},env,new Date('2026-10-04T18:00:00Z')).key,'site-failure-2026-10-05');
});
test('receipt reconciliation and rerun block prevent blind duplicate sends',async()=>{
  let calls=0;
  const result=await sendOwnerNotice(notice,env,async()=>{calls++;return json({artifacts:[{name:'owner-alert-workflow-456-1',expired:false}]});});
  assert.equal(result.skipped,true);assert.equal(calls,1);
  await assert.rejects(sendOwnerNotice(notice,{...env,GITHUB_RUN_ATTEMPT:'2'},async()=>{throw Error('must not call');}),/Reconcile/);
  await assert.rejects(sendOwnerNotice(notice,env,async()=>json({},403)),/Cannot reconcile/);
});
test('only verified owner private chat may receive message; acknowledgment checked',async()=>{
  const calls=[];
  const request=async(url,options)=>{
    calls.push(url);
    if(url.includes('api.github.com'))return json({artifacts:[]});
    if(url.endsWith('/getChat'))return json({ok:true,result:{id:6451516147,type:'private'}});
    assert.equal(options.body.get('chat_id'),'6451516147');
    return json({ok:true,result:{message_id:42,chat:{id:6451516147,type:'private'}}});
  };
  const r=await sendOwnerNotice(notice,env,request);
  assert.equal(r.message_id,42);assert.equal(r.owner_verified,true);assert.equal(calls.length,3);
  for(const chat of [{id:6451516147,type:'group'},{id:999,type:'private'}]){
    let sent=false;
    await assert.rejects(sendOwnerNotice(notice,env,async url=>{
      if(url.includes('api.github.com'))return json({artifacts:[]});
      if(url.endsWith('/sendMessage'))sent=true;
      return json({ok:true,result:chat});
    }),/verified private owner/);
    assert.equal(sent,false);
  }
});
test('uncertain send outcome is not retried and transport errors are redacted',async()=>{
  let sends=0;
  await assert.rejects(sendOwnerNotice(notice,env,async url=>{
    if(url.includes('api.github.com'))return json({artifacts:[]});
    if(url.endsWith('/getChat'))return json({ok:true,result:{id:6451516147,type:'private'}});
    sends++;throw Error('token-in-url');
  }),e=>/outcome unknown/.test(e.message)&&!e.message.includes('token-in-url'));
  assert.equal(sends,1);
});
