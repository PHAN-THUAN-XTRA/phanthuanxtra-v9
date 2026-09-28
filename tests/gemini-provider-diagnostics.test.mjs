import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectGeminiProvider } from '../src/gemini-provider-diagnostics.js';
import { handlePublishingApi } from '../src/publishing-api.js';
import { issueAdminToken } from '../src/admin-auth.js';
const environment=()=>({GEMINI_MODEL:'gemini-3.5-flash-lite',GEMINI_API_KEY:crypto.randomUUID(),ADMIN_PASSWORD:crypto.randomUUID(),PUBLISH_API_KEY:crypto.randomUUID()});

test('model metadata probe uses the production model and omits secrets and unrelated provider fields',async t=>{
  const env=environment();
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/'+env.GEMINI_MODEL);
    assert.equal(options.headers['x-goog-api-key'],env.GEMINI_API_KEY);
    assert.equal(options.redirect,'error');
    return Response.json({name:'models/'+env.GEMINI_MODEL,supportedGenerationMethods:['generateContent'],description:env.GEMINI_API_KEY});
  });
  assert.deepEqual(await inspectGeminiProvider(env),{provider:'gemini',model:env.GEMINI_MODEL,configured:true,generation_verified:false,http_status:200,available:true,supports_generate_content:true});
});
test('provider errors expose only allowlisted status and never raw messages',async t=>{
  const env=environment();
  t.mock.method(globalThis,'fetch',async()=>Response.json({error:{status:'UNAVAILABLE',message:env.GEMINI_API_KEY}},{status:503}));
  const result=await inspectGeminiProvider(env);
  assert.equal(result.available,false);assert.equal(result.provider_status,'UNAVAILABLE');
  assert.equal(result.generation_verified,false);assert.ok(!JSON.stringify(result).includes(env.GEMINI_API_KEY));
});
test('invalid configuration cannot inject a URL or leak a key as the model',async t=>{
  const env=environment();env.GEMINI_MODEL=env.GEMINI_API_KEY;
  const fetch=t.mock.method(globalThis,'fetch',()=>{throw new Error('must not fetch');});
  const result=await inspectGeminiProvider(env);
  assert.equal(result.model,null);assert.equal(result.configured,false);assert.equal(fetch.mock.callCount(),0);
});
for(const [name,response] of [
  ['oversized body',()=>new Response('x'.repeat(32769))],
  ['malformed JSON',()=>new Response('not JSON')],
  ['timeout',()=>{throw new DOMException('private URL and key','TimeoutError');}]
])test(name+' stays bounded and cannot become a generation success',async t=>{
  t.mock.method(globalThis,'fetch',response);
  const result=await inspectGeminiProvider(environment());
  assert.equal(result.generation_verified,false);assert.ok(['probe_failed','timeout'].includes(result.error));
  assert.ok(!JSON.stringify(result).includes('private URL'));
});
test('diagnostics require an admin session before any provider call, including with a publishing key',async t=>{
  const env=environment();let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({name:'models/'+env.GEMINI_MODEL,supportedGenerationMethods:['generateContent']});});
  const request=(credential,method='GET')=>new Request('https://phanthuanxtra.com/api/publish/v1/diagnostics/gemini',{method,headers:credential?{Authorization:`Bearer ${credential}`}:{}});
  assert.equal((await handlePublishingApi(request(),env)).status,401);
  assert.equal((await handlePublishingApi(request(env.PUBLISH_API_KEY),env)).status,403);
  const session=await issueAdminToken(env);
  assert.equal((await handlePublishingApi(request(session,'POST'),env)).status,405);
  assert.equal(calls,0);
  const response=await handlePublishingApi(request(session),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).model,env.GEMINI_MODEL);assert.equal(calls,1);
});
