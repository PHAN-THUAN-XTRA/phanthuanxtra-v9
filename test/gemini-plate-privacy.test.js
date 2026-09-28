import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePrivateCover, ImagePrivacyError } from '../src/gemini-plate-privacy.js';
import { storePublishingImage } from '../src/publishing-api.js';

test('preparePrivateCover fails closed with normalize stage when Images input throws', async () => {
  const env = {
    IMAGES: { input() { throw new TypeError('simulated images failure'); } }
  };
  await assert.rejects(
    preparePrivateCover(env, new Uint8Array([1,2,3])),
    error => {
      assert.ok(error instanceof ImagePrivacyError);
      assert.equal(error.status, 422);
      assert.equal(error.stage, 'normalize');
      assert.match(error.message, /normalize/);
      assert.doesNotMatch(error.message, /simulated images failure/);
      assert.equal(error.reason,'simulated images failure');
      return true;
    }
  );
});

test('preparePrivateCover rejects missing Images binding without persisting source', async () => {
  await assert.rejects(
    preparePrivateCover({}, new Uint8Array([1])),
    error => error instanceof ImagePrivacyError && error.status === 422
  );
});


test('preparePrivateCover uses supported Images output options during normalize', async () => {
  let outputOptions;
  const env = {
    IMAGES: {
      input() {
        return {
          transform() { return this; },
          output(options) {
            outputOptions=options;
            throw new TypeError('stop after capturing output contract');
          }
        };
      }
    }
  };
  await assert.rejects(preparePrivateCover(env,new Uint8Array([1])),ImagePrivacyError);
  assert.deepEqual(outputOptions,{format:'image/webp',quality:85});
  assert.equal(Object.hasOwn(outputOptions,'metadata'),false);
});


test('image privacy diagnostic reason redacts credential-like tokens and URLs', async () => {
  const env={IMAGES:{input(){throw new Error('failed https://example.invalid/path token_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');}}};
  await assert.rejects(preparePrivateCover(env,new Uint8Array([1])),error=>{
    assert.ok(error instanceof ImagePrivacyError);
    assert.equal(error.stage,'normalize');
    assert.doesNotMatch(error.reason,/https:\/\//);
    assert.doesNotMatch(error.reason,/ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
    assert.match(error.reason,/\[url\]|redacted/);
    assert.ok(error.reason.length<=180);
    return true;
  });
});


test('production publishing verifier keeps bounded API failure evidence', async () => {
  const source=await (await import('node:fs/promises')).readFile(new URL('../scripts/verify-publishing-production.mjs',import.meta.url),'utf8');
  assert.match(source,/const text=await response\.text\(\)/);
  assert.match(source,/text\.slice\(0,500\)/);
});


test('publishing runtime diagnostic stays bounded and redacts URL/token patterns', async () => {
  const source=await (await import('node:fs/promises')).readFile(new URL('../src/publishing-api.js',import.meta.url),'utf8');
  assert.match(source,/function safeFailureReason/);
  assert.match(source,/slice\(0,180\)/);
  assert.match(source,/\[redacted\]/);
  assert.match(source,/reason:safeFailureReason\(error\)/);
});


test('Gemini privacy provider retries transient timeout and remains fail-closed', async () => {
  const source=await (await import('node:fs/promises')).readFile(new URL('../src/gemini-plate-privacy.js',import.meta.url),'utf8');
  assert.match(source,/for\(let attempt=0;attempt<4;attempt\+\+\)/);
  assert.match(source,/response\.status===429\|\|response\.status>=500/);
  assert.match(source,/TimeoutError.*AbortError/);
  assert.match(source,/attempt===3/);
  assert.match(source,/750\*\(attempt\+1\)/);
  assert.match(source,/throw new ImagePrivacyError/);
});


test('Gemini semantic privacy rejection preserves detect and verify stages', async () => {
  const source=await (await import('node:fs/promises')).readFile(new URL('../src/gemini-plate-privacy.js',import.meta.url),'utf8');
  assert.match(source,/complete!==true[^\n]+reject\('gemini-detect'\)/);
  assert.match(source,/box\.length!==4[^\n]+reject\('gemini-detect'\)/);
  assert.match(source,/safe!==true\|\|verification\?\.certain!==true\)reject\('gemini-verify'\)/);
});


function privacyEnvironment() {
  const writes=[];
  const pipeline={
    transform(){return this;},
    async output(){return {response:()=>new Response('normalized-webp')};}
  };
  return {writes,env:{
    GEMINI_API_KEY:crypto.randomUUID(),GEMINI_MODEL:'gemini-test',
    IMAGES:{input(){return pipeline;},async info(){return {width:1000,height:500};}},
    MEDIA:{async put(...args){writes.push(args);}}
  }};
}

const diagnostics=[
  ['HTTP rejection',()=>new Response('provider content must stay private',{status:403}),'Gemini HTTP 403'],
  ['non-STOP completion',()=>Response.json({candidates:[{finishReason:'MAX_TOKENS'}]}),'Gemini finishReason MAX_TOKENS'],
  ['missing candidate',()=>Response.json({}),'Gemini finishReason missing'],
  ['malformed structured JSON',()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'private malformed model content'}]}}]}),'Gemini structured JSON parse failed'],
  ['missing content parts',()=>Response.json({candidates:[{finishReason:'STOP',content:{}}]}),'Gemini structured JSON parse failed']
];
for(const stageName of ['gemini-detect','gemini-verify']) {
  for(const [name,response,reason] of diagnostics) {
    test(`${stageName}: ${name} keeps its diagnostic and prevents R2 writes`,async t=>{
      const {env,writes}=privacyEnvironment();let calls=0;
      t.mock.method(globalThis,'fetch',async()=>{
        calls++;
        if(stageName==='gemini-verify'&&calls===1)
          return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({complete:true,boxes:[]})}]}}]});
        return response();
      });
      await assert.rejects(storePublishingImage(env,new Uint8Array([1])),error=>{
        assert.ok(error instanceof ImagePrivacyError);
        assert.equal(error.status,422);
        assert.equal(error.stage,stageName);
        assert.equal(error.reason,reason);
        assert.doesNotMatch(error.reason,/private|provider content/);
        return true;
      });
      assert.equal(calls,stageName==='gemini-detect'?1:2);
      assert.equal(writes.length,0);
    });
  }
}

test('string diagnostics redact URLs and credential-like values and remain bounded',async t=>{
  const {env,writes}=privacyEnvironment();
  const finishReason='SAFETY https://example.invalid/private token_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 '+ 'detail '.repeat(40);
  t.mock.method(globalThis,'fetch',async()=>Response.json({candidates:[{finishReason}]}));
  await assert.rejects(storePublishingImage(env,new Uint8Array([1])),error=>{
    assert.equal(error.stage,'gemini-detect');
    assert.match(error.reason,/^Gemini finishReason SAFETY/);
    assert.match(error.reason,/url/);
    assert.match(error.reason,/redacted/);
    assert.doesNotMatch(error.reason,/https:|example\.invalid|ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
    assert.ok(error.reason.length<=180);
    return true;
  });
  assert.equal(writes.length,0);
});
