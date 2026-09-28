import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedBoxes, preparePrivateCover } from '../src/gemini-plate-privacy.js';
import { storePublishingImage } from '../src/publishing-api.js';
function setup() {
  const draws=[],writes=[];
  const pipeline={transform(){return this;},draw(layer,position){draws.push(position);return this;},async output(){return {response:()=>new Response('normalized-webp')};}};
  return {draws,writes,env:{GEMINI_API_KEY:crypto.randomUUID(),GEMINI_MODEL:'gemini-test',IMAGES:{input(){return pipeline;},async info(){return {width:1000,height:500};}},MEDIA:{async put(...args){writes.push(args);}}}};
}
function mock(t,results) {
  let count=0;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    assert.equal(new URL(url).hostname,'generativelanguage.googleapis.com');
    assert.equal(JSON.parse(init.body).contents[0].parts[0].inline_data.mime_type,'image/webp');
    const value=results[count++];
    return value instanceof Response?value:Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]});
  });
  return ()=>count;
}
test('reject uncertain, inverted, non-numeric or excessive plate boxes',()=>{
  for(const value of [{complete:false,boxes:[]},{complete:true,boxes:[[0,1,0,2]]},{complete:true,boxes:[[0,1,2,1001]]},{complete:true,boxes:[[0,'1',2,3]]},{complete:true,boxes:Array(31).fill([0,0,1,1])}])assert.throws(()=>checkedBoxes(value));
});
test('all plates receive opaque overlays before review and one R2 write',async t=>{
  const {env,draws,writes}=setup();const count=mock(t,[{complete:true,boxes:[[100,100,200,300],[800,800,1000,1000]]},{safe:true,certain:true}]);
  await storePublishingImage(env,new Uint8Array([1]));
  assert.equal(count(),2);assert.equal(draws.length,2);assert.equal(writes.length,1);
  assert.equal(writes[0][2].customMetadata.plate_count,'2');
  assert.ok(draws[0].left<100&&draws[0].top<50);
});
test('no plates still requires independent output review',async t=>{
  const {env,draws}=setup();const count=mock(t,[{complete:true,boxes:[]},{safe:true,certain:true}]);
  await preparePrivateCover(env,new Uint8Array([1]));assert.equal(draws.length,0);assert.equal(count(),2);
});
for(const [name,results] of [
  ['uncertain detection',[{complete:false,boxes:[]}]],
  ['exposed plate',[{complete:true,boxes:[]},{safe:false,certain:true}]],
  ['uncertain review',[{complete:true,boxes:[]},{safe:true,certain:false}]],
  ['provider quota',[new Response('',{status:429})]],
  ['malformed response',[{}]]
])test(name+' never writes originals to R2',async t=>{
  const {env,writes}=setup();mock(t,results);await assert.rejects(()=>storePublishingImage(env,new Uint8Array([1])));assert.equal(writes.length,0);
});
test('missing key fails closed without provider or R2 calls',async t=>{
  const {env,writes}=setup();delete env.GEMINI_API_KEY;const count=mock(t,[]);
  await assert.rejects(()=>storePublishingImage(env,new Uint8Array([1])));assert.equal(count(),0);assert.equal(writes.length,0);
});


test('transient Gemini timeout retries once and still requires independent review',async t=>{
  const {env,writes}=setup();let count=0;
  t.mock.method(globalThis,'fetch',async()=>{
    count++;
    if(count===1){const error=new Error('transient');error.name='TimeoutError';throw error;}
    const value=count===2?{complete:true,boxes:[]}:{safe:true,certain:true};
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]});
  });
  await storePublishingImage(env,new Uint8Array([1]));
  assert.equal(count,3);assert.equal(writes.length,1);
});

test('Gemini 503 recovery still requires complete detection and independent verification before R2',async t=>{
  const {env,writes}=setup();
  t.mock.method(globalThis,'setTimeout',callback=>{queueMicrotask(callback);return 0;});
  const count=mock(t,[new Response('',{status:503}),new Response('',{status:503}),{complete:true,boxes:[]},{safe:true,certain:true}]);
  await storePublishingImage(env,new Uint8Array([1]));
  assert.equal(count(),4);assert.equal(writes.length,1);
});

test('four Gemini 503 failures preserve the reason and never persist source bytes',async t=>{
  const {env,writes}=setup();
  t.mock.method(globalThis,'setTimeout',callback=>{queueMicrotask(callback);return 0;});
  const count=mock(t,Array.from({length:4},()=>new Response('',{status:503})));
  await assert.rejects(storePublishingImage(env,new Uint8Array([1])),error=>{
    assert.equal(error.status,422);assert.equal(error.stage,'gemini-detect');
    assert.equal(error.reason,'Gemini HTTP 503');return true;
  });
  assert.equal(count(),4);assert.equal(writes.length,0);
});
