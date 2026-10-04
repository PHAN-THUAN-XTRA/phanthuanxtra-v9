import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixture } from './fixtures/ai-discovery.mjs';
import { handleAiDiscovery, renderVehicle, vehicleSchema } from '../src/ai-discovery.js';
import { norm } from '../src/index.js';


test('detail is UTF-8 SSR for both users and crawlers, with canonical facts and ordered gallery',async()=>{
  const {env,sqlite}=fixture();
  for (const path of ['/car?id=tg-test','/car.html?id=tg-test','/car/?id=tg-test']) {
    const r=await handleAiDiscovery(new Request('https://phanthuanxtra.com'+path),env);
    const html=await r.text();assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/charset=utf-8/);
    assert.match(html,/<h1>LEXUS RX350L<\/h1>/);assert.match(html,/Xe thật\nGiá owner/);
    assert.match(html,/rel="canonical" href="https:\/\/phanthuanxtra.com\/car.html\?id=tg-test"/);
    assert.doesNotMatch(html,/Đang tải thông tin|fetch\('\/api\/cars'/);
    assert.ok(html.indexOf('ảnh 1')<html.indexOf('ảnh 2'));
    const schema=JSON.parse(html.match(/application\/ld\+json">([^<]+)</)[1]);
    assert.equal(schema.offers.price,2000000000);assert.equal(schema.offers.priceCurrency,'VND');
    assert.equal(schema.mileageFromOdometer,undefined);
  }
  sqlite.close();
});
test('hidden/draft/missing details fail closed; outages never resurrect static records',async()=>{
  const {env,sqlite}=fixture();
  for(const id of ['tg-hidden','tg-draft','missing','<script>']) {
    const r=await handleAiDiscovery(new Request('https://phanthuanxtra.com/car?id='+encodeURIComponent(id)),env);
    assert.equal(r.status,404);assert.equal(r.headers.get('x-robots-tag'),'noindex');
  }
  env.DB.prepare=()=>{throw Error('database outage')};
  assert.equal((await handleAiDiscovery(new Request('https://phanthuanxtra.com/car?id=tg-test'),env)).status,503);
  sqlite.close();
});
test('catalog and sitemap contain public vehicles/published blog only',async()=>{
  const {env,sqlite}=fixture();
  for(const path of ['/cars','/sitemap.xml']) {
    const r=await handleAiDiscovery(new Request('https://phanthuanxtra.com'+path),env);const body=await r.text();
    assert.equal(r.status,200);assert.match(body,/tg-test/);assert.doesNotMatch(body,/tg-hidden|tg-draft|private-post/);
    if(path==='/sitemap.xml'){assert.match(body,/public-post/);assert.match(body,/\/yachts/);assert.doesNotMatch(body,/<lastmod>/)}
  }
  sqlite.close();
});
test('owner text is escaped; unsafe media and script injection cannot execute',()=>{
  const row={id:'tg-safe',brand:'X',model:'Y',status:'available',features_json:'[]',description:'</script><script>alert(1)</script>',price:null,mileage:null};
  const c=norm(row,[{url:'javascript:alert(1)'},{url:'/media/ok.webp'}]);
  const html=renderVehicle(readFileSync('public/car.html','utf8'),row,c);
  assert.doesNotMatch(html,/<script>alert|javascript:alert/);assert.match(html,/&lt;\/script&gt;/);
  assert.equal(vehicleSchema(row,c).offers,undefined);
});
test('HEAD has no body and write methods are denied',async()=>{
  const {env,sqlite}=fixture();
  const r=await handleAiDiscovery(new Request('https://phanthuanxtra.com/car?id=tg-test',{method:'HEAD'}),env);
  assert.equal(r.status,200);assert.equal(await r.text(),'');
  assert.equal((await handleAiDiscovery(new Request('https://phanthuanxtra.com/cars',{method:'POST'}),env)).status,405);
  sqlite.close();
});
