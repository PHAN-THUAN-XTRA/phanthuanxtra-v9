import test from 'node:test';
import assert from 'node:assert/strict';

function runVerifier(t,{failures=[],anonymousStatus=404}={}) {
  const previous=process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD=crypto.randomUUID();
  t.after(()=>{if(previous===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=previous;});
  const session=crypto.randomUUID();
  const media={key:'admin/test-cover.webp',url:'/media/admin/test-cover.webp',content_type:'image/webp'};
  const state={uploads:0,anonymous:[],authenticated:[],deletes:[],delays:[],logs:[],creates:0,publishes:0};
  let post;
  t.mock.method(console,'log',message=>state.logs.push(message));
  t.mock.method(globalThis,'setTimeout',(callback,delay)=>{
    state.delays.push(delay);queueMicrotask(callback);return 0;
  });
  t.mock.method(globalThis,'fetch',async(input,options={})=>{
    // A missing base must throw just as Node's real fetch does.
    const url=new URL(input);
    assert.equal(url.origin,'https://phanthuanxtra.com');
    const path=url.pathname,method=options.method||'GET';
    const authorization=new Headers(options.headers).get('authorization');
    if(path==='/api/admin/login')return Response.json({token:session});
    if(path===media.url) {
      if(authorization===null) {
        assert.equal(options.redirect,'manual');
        state.anonymous.push(url.pathname+url.search);
        return new Response('',{status:anonymousStatus});
      }
      assert.equal(authorization,`Bearer ${session}`);
      state.authenticated.push(url.pathname+url.search);
      return new Response('webp',{headers:{'content-type':'image/webp'}});
    }
    assert.equal(authorization,`Bearer ${session}`);
    if(path==='/api/publish/v1/diagnostics/gemini')return Response.json({model:'gemini-3.5-flash-lite',generation_verified:false});
    if(method==='DELETE') {
      assert.ok(path==='/api/admin/posts/123'||path==='/api/admin/media/'+encodeURIComponent(media.key));
      state.deletes.push(path);return Response.json({ok:true});
    }
    if(path==='/api/publish/v1/media') {
      const failure=failures[state.uploads++];
      if(failure)return Response.json(failure.body,{status:failure.status||422});
      return Response.json(media,{status:201});
    }
    if(path==='/api/publish/v1/posts') {
      const duplicate=Boolean(post);state.creates++;
      post??={...JSON.parse(options.body),id:123,slug:'verifier-test',status:'draft'};
      return Response.json({id:post.id,post,public_url:null,duplicate},{status:duplicate?200:201});
    }
    if(path==='/api/publish/v1/posts/123/publish') {
      state.publishes++;post.status='published';post.published_at??='2026-09-28T15:00:00Z';
      return Response.json({post,public_url:'https://phanthuanxtra.com/blog/'+post.slug});
    }
    if(path==='/blog/verifier-test') {
      if(post.status==='draft')return new Response('',{status:404});
      return new Response(post.title+' '+media.url,{headers:{'content-type':'text/html; charset=utf-8'}});
    }
    throw new Error(`Unexpected verifier request: ${method} ${path}`);
  });
  return {state,run:()=>import(`../scripts/verify-publishing-production.mjs?test=${crypto.randomUUID()}`)};
}
const unavailable={body:{stage:'gemini-detect',reason:'Gemini HTTP 503'}};

test('publishing verifier resolves relative media URLs and checks all anonymous variants before publish',async t=>{
  const {state,run}=runVerifier(t);
  await run();
  assert.deepEqual(state.anonymous,[
    '/media/admin/test-cover.webp','/media/admin/test-cover.webp?format=webp','/media/admin/test-cover.webp?format=avif'
  ]);
  assert.deepEqual(state.authenticated,state.anonymous);
  assert.equal(state.uploads,1);assert.equal(state.creates,2);assert.equal(state.publishes,2);
  assert.equal(state.deletes.length,2);
});

test('Gemini 503 recovery retries with backoff and still requires the entire publishing lifecycle',async t=>{
  const {state,run}=runVerifier(t,{failures:[unavailable,unavailable]});
  await run();
  assert.equal(state.uploads,3);
  assert.deepEqual(state.delays,[10000,20000]);
  assert.equal(state.anonymous.length,3);assert.equal(state.publishes,2);assert.equal(state.deletes.length,2);
});

test('exhausted Gemini 503 retries fail the gate without creating or publishing a post',async t=>{
  const {state,run}=runVerifier(t,{failures:[unavailable,unavailable,unavailable]});
  await assert.rejects(run(),/Authenticated image upload: HTTP 422.*Gemini HTTP 503/);
  assert.equal(state.uploads,3);assert.deepEqual(state.delays,[10000,20000]);
  assert.equal(state.creates,0);assert.equal(state.publishes,0);assert.equal(state.anonymous.length,0);
  assert.ok(state.logs.every(message=>!message.includes('PASS')));
});

for(const [name,body] of [
  ['semantic rejection',{stage:'gemini-verify',reason:''}],
  ['malformed output',{stage:'gemini-detect',reason:'Gemini structured JSON parse failed'}],
  ['permission failure',{stage:'gemini-detect',reason:'Gemini HTTP 403'}],
  ['non-Gemini failure',{stage:'normalize',reason:'Gemini HTTP 503'}],
  ['unclassified reason',{stage:'gemini-detect',reason:'unexpected content Gemini HTTP 503'}]
])test(`${name} fails immediately without upload retries`,async t=>{
  const {state,run}=runVerifier(t,{failures:[{body}]});
  await assert.rejects(run(),/Authenticated image upload: HTTP 422/);
  assert.equal(state.uploads,1);assert.deepEqual(state.delays,[]);
  assert.equal(state.publishes,0);assert.ok(state.logs.every(message=>!message.includes('PASS')));
});

test('public draft media fails the gate and cleans up the temporary upload',async t=>{
  const {state,run}=runVerifier(t,{anonymousStatus:200});
  await assert.rejects(run(),/Canonical must deny anonymous draft media; HTTP 200/);
  assert.equal(state.creates,0);assert.equal(state.publishes,0);
  assert.deepEqual(state.deletes,['/api/admin/media/admin%2Ftest-cover.webp']);
});
