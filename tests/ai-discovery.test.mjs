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
test('tg-811 SSR uses the owner-approved public title without changing stored facts or gallery',async()=>{
  const {env,sqlite}=fixture();
  try {
    sqlite.exec("UPDATE cars SET id='tg-811',brand='ROLLS-ROYCE',model='PHANTOM 2009',year=2009,price=7680000000 WHERE id='tg-test'; UPDATE car_images SET car_id='tg-811' WHERE car_id='tg-test';");
    const before=JSON.stringify(sqlite.prepare("SELECT * FROM cars WHERE id='tg-811'").get());
    const beforeImages=JSON.stringify(sqlite.prepare("SELECT * FROM car_images WHERE car_id='tg-811' ORDER BY sort_order,id").all());
    const r=await handleAiDiscovery(new Request('https://phanthuanxtra.com/car.html?id=tg-811'),env);
    const html=await r.text(),title='Rolls-Royce Phantom VII 2009 – Sedan Siêu Sang V12 6.75L';
    assert.equal(r.status,200);
    assert.ok(html.includes('<h1>'+title+'</h1>'));
    assert.ok(html.includes('<title>'+title+' | PHAN THUẦN XTRA</title>'));
    assert.ok(html.includes('<meta property="og:title" content="'+title+'">'));
    assert.ok(html.includes('<meta name="twitter:title" content="'+title+'">'));
    const schema=JSON.parse(html.match(/application\/ld\+json">([^<]+)</)[1]);
    assert.equal(schema.name,title);assert.equal(schema.model,'PHANTOM 2009');
    assert.equal(schema.offers.price,7680000000);
    assert.match(html,/7\.680\.000\.000 đ/);assert.match(html,/Đang bán/);assert.match(html,/Xe thật\nGiá owner/);
    assert.ok(html.indexOf('ảnh 1')<html.indexOf('ảnh 2'));
    assert.equal(JSON.stringify(sqlite.prepare("SELECT * FROM cars WHERE id='tg-811'").get()),before);
    assert.equal(JSON.stringify(sqlite.prepare("SELECT * FROM car_images WHERE car_id='tg-811' ORDER BY sort_order,id").all()),beforeImages);
  } finally {sqlite.close();}
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
