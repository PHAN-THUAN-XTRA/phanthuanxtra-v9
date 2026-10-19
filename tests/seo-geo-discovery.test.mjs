import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fixture } from './fixtures/ai-discovery.mjs';
import { handleAiDiscovery } from '../src/ai-discovery.js';

const home=readFileSync('public/index.html','utf8');
const sitemap=readFileSync('public/sitemap.xml','utf8');
const llms=readFileSync('public/llms.txt','utf8');

test('GEO guide references canonical, real public pages and no private details',()=>{
  for(const slug of ['/cars','/yachts','/business-jets','/green-energy','/phan-thuan','/blog'])
    assert.ok(llms.includes('https://phanthuanxtra.com'+slug),slug);
  assert.match(llms,/không suy đoán danh tính|Không suy đoán danh tính/);
  assert.doesNotMatch(llms,/đánh giá 5 sao|tỷ lệ thành công 100%/i);
});

test('homepage provides valid canonical, published image and connected organization graph',()=>{
  assert.match(home,/<link rel="canonical" href="https:\/\/phanthuanxtra.com\/"/);
  assert.doesNotMatch(home,/og-image\.jpg/);
  const url=home.match(/<meta property="og:image" content="https:\/\/phanthuanxtra\.com(\/[^"]+)"/)?.[1];
  assert.ok(url,'Must provide an og:image');
  assert.ok(existsSync('public'+url),'Share image must be an actual public asset');
  const structured=JSON.parse(home.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]||'null');
  const graph=structured['@graph'];
  assert.ok(graph.some(x=>x['@type']==='Organization' && x['@id']==='https://phanthuanxtra.com/#organization'));
  assert.ok(graph.some(x=>x['@type']==='WebSite'));
  assert.ok(graph.some(x=>x['@type']==='WebPage'));
});

test('sitemap excludes missing and noindex pages without blocking public catalog',()=>{
  assert.doesNotMatch(sitemap,/car-lx600\.html/);
  assert.doesNotMatch(sitemap,/trai-nghiem-xe/);
  assert.match(readFileSync('public/robots.txt','utf8'),/Sitemap: https:\/\/phanthuanxtra\.com\/sitemap.xml/);
});

test('server-rendered car detail exposes genuine social previews without client hydration',async()=>{
  const {env,sqlite}=fixture();
  try{
    const html=await (await handleAiDiscovery(new Request('https://phanthuanxtra.com/car.html?id=tg-test'),env)).text();
    assert.match(html,/name="twitter:description"/);
    assert.match(html,/property="og:description"/);
    assert.match(html,/property="og:url" content="https:\/\/phanthuanxtra\.com\/car\.html\?id=tg-test"/);
    assert.doesNotMatch(html,/Đang tải thông tin xe/);
  }finally{sqlite.close()}
});

test('catalog provides indexed CollectionPage and real inventory ItemList',async()=>{
  const {env,sqlite}=fixture();
  try{
    const html=await (await handleAiDiscovery(new Request('https://phanthuanxtra.com/cars'),env)).text();
    assert.match(html,/rel="canonical" href="https:\/\/phanthuanxtra\.com\/cars"/);
    assert.match(html,/name="description"/);
    const data=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]||'null');
    assert.equal(data['@type'],'CollectionPage');
    const list=data.mainEntity.itemListElement;
    assert.ok(list.some(x=>x.url==='https://phanthuanxtra.com/car.html?id=tg-test'));
    assert.ok(list.every(x=>!x.url.includes('tg-hidden')&&!x.url.includes('tg-draft')));
  }finally{sqlite.close()}
});
