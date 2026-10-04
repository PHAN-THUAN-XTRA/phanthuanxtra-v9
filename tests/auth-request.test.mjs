import test from 'node:test';
import assert from 'node:assert/strict';
import {readAuthJson} from '../src/auth-request.js';
import {handleAppAdmin} from '../src/app-admin.js';
import {handleAppApi} from '../src/app-api.js';
import {verifyAdminToken} from '../src/admin-auth.js';
const encoder=new TextEncoder();
const request=(path,body,headers={})=>new Request('https://example.test'+path,{method:'POST',headers,body,...(body instanceof ReadableStream?{duplex:'half'}:{})});
const endpoints=['/api/admin/login','/api/admin/forgot-password','/api/admin/recovery/rotate','/api/app/v1/login'];
const handle=(path,r,env)=>path.startsWith('/api/app/')?handleAppApi(r,env):handleAppAdmin(r,env);

for(const path of endpoints) test(path+' rejects oversized actual streams before credential lookup',async()=>{
  let reads=0,cancelled=false;
  const env={ADMIN_PASSWORD:'fixture-password',ADMIN_TOKEN:'fixture-secret',DB:{prepare(){reads++;throw Error('should not read credentials');}}};
  const stream=new ReadableStream({start(c){c.enqueue(encoder.encode(JSON.stringify({password:'a'.repeat(9000)})));},cancel(){cancelled=true;}});
  const r=await handle(path,request(path,stream,{'content-length':'1'}),env);
  assert.equal(r.status,413);assert.equal(reads,0);assert.equal(cancelled,true);
  assert.equal(r.headers.get('cache-control'),'no-store');
});

test('declared oversized input is rejected and cancelled without reading it',async()=>{
  let cancelled=false;
  const body=new ReadableStream({cancel(){cancelled=true;}});
  const result=await readAuthJson(request('/test',body,{'content-length':'100000'}));
  assert.equal(result.response.status,413);assert.equal(cancelled,true);
});

test('malformed, null, scalar, array and invalid UTF-8 input returns 400',async()=>{
  for(const body of ['{','null','42','[]','"password"',new Uint8Array([0xff])]){
    const parsed=await readAuthJson(request('/test',body));
    assert.equal(parsed.response.status,400);
  }
  for(const path of endpoints) assert.equal((await handle(path,request(path,'null'),{})).status,400);
});

test('byte limit counts UTF-8 bytes and bounds tiny streaming chunks',async()=>{
  const over=await readAuthJson(request('/test',JSON.stringify({password:'ầ'.repeat(3000)})));
  assert.equal(over.response.status,413);
  let cancelled=false;
  const tiny=new ReadableStream({pull(c){c.enqueue(new Uint8Array());},cancel(){cancelled=true;}});
  assert.equal((await readAuthJson(request('/test',tiny))).response.status,413);
  assert.equal(cancelled,true);
});

test('bounded JSON retains Vietnamese credentials and permits the exact byte boundary',async()=>{
  const body=JSON.stringify({password:'mật khẩu thử nghiệm'});
  assert.deepEqual((await readAuthJson(request('/test',body))).data,{password:'mật khẩu thử nghiệm'});
  const boundary='{"password":"'+ 'a'.repeat(8192-15)+'"}';
  assert.equal(encoder.encode(boundary).length,8192);
  assert.ok((await readAuthJson(request('/test',boundary))).data);
});

test('valid credentials still issue a usable session on both login surfaces',async()=>{
  const env={ADMIN_PASSWORD:'fixture-password',ADMIN_TOKEN:'fixture-signing-secret',DB:{prepare(){return {first:async()=>null};}}};
  for(const path of ['/api/admin/login','/api/app/v1/login']){
    const r=await handle(path,request(path,JSON.stringify({password:env.ADMIN_PASSWORD})),env);
    assert.equal(r.status,200);
    const data=await r.json();
    const verified=await verifyAdminToken(new Request('https://example.test',{headers:{Authorization:'Bearer '+data.token}}),env);
    assert.equal(verified.ok,true);
    assert.equal((await handle(path,request(path,'{"password":"incorrect"}'),env)).status,401);
  }
});
