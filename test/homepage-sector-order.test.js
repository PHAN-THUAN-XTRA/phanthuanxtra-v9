import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

test('homepage places flagship sector 05 directly after sector 01 and before the founder', () => {
  const selectors = [
    'class="hero hero-xtra"',
    'id="cars-section"',
    'id="ai-assistant"',
    'id="about-phan-thuan"',
    'id="ecosystem"',
    'id="test-drive"',
    'id="blog"',
    'id="contact"',
  ];
  let previous = -1;
  for (const selector of selectors) {
    const position = html.indexOf(selector);
    assert.ok(position > previous, 'section missing or out of order: ' + selector);
    previous = position;
  }
  const between = html.slice(html.indexOf('id="cars-section"'), html.indexOf('id="ai-assistant"'));
  assert.doesNotMatch(between, /sector-journey|sector-preview|02 \/ DU THUYỀN|03 \/ CHUYÊN CƠ|04 \/ NĂNG LƯỢNG/);
  assert.doesNotMatch(html, /id="sector-journey"/);
});

test('all five existing hero slides remain available despite removing repeated 02–04 previews', () => {
  for (const sector of ['auto','yacht','jet','energy','feng-shui']) {
    assert.ok(html.includes('id="hero-slide-' + sector + '"'), 'missing hero sector: ' + sector);
  }
  assert.deepEqual([...html.matchAll(/data-slide="(\d)"/g)].map(m => +m[1]), [0,1,2,3,4]);
});

test('ecosystem card labels align with the canonical 01–05 sector order', () => {
  const ecosystem = html.match(/<section class="section ecosystem"[^]*?<\/section>/)?.[0] || '';
  const cards = [...ecosystem.matchAll(/<a class="industry-card industry-([^"]+)" href="([^"]+)"><span>([^<]+)<\/span>/g)]
    .map(m => ({kind:m[1],href:m[2],label:m[3]}));
  assert.deepEqual(cards, [
    {kind:'auto',href:'#cars-section',label:'01 / Ô TÔ'},
    {kind:'yacht',href:'/yachts',label:'02 / DU THUYỀN'},
    {kind:'jet',href:'/business-jets',label:'03 / HÀNG KHÔNG'},
    {kind:'solar',href:'/green-energy',label:'04 / NĂNG LƯỢNG'},
    {kind:'ai',href:'#ai-assistant',label:'05 / PHONG THỦY'},
  ]);
});

test('feng shui subchapters use premium A/B lettering without colliding with sector numbers', () => {
  const feng = html.match(/<section class="section ai-section feng-shui-section"[^]*?<\/section>/)?.[0] || '';
  assert.match(feng, /05 \/ PHONG THỦY ĐỘC BẢN/);
  assert.deepEqual([...feng.matchAll(/class="feng-shui-heading"><span aria-label="Phân mục ([AB])">([AB])<\/span>/g)].map(m => m[2]), ['A','B']);
  assert.doesNotMatch(feng, /class="feng-shui-heading"><span>0[12]<\/span>/);
  assert.equal((feng.match(/class="plate-pattern"/g) || []).length, 3);
  assert.equal((feng.match(/scope="row"/g) || []).length, 5);
  assert.match(css, /\.feng-shui-heading>span\{display:inline-grid/);
});

test('removing redundant strip preserves anchors and chapter A/B styling', () => {
  for (const id of ['cars-section','ai-assistant','about-phan-thuan','ecosystem','test-drive','blog','contact']) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, 'duplicate anchor: ' + id);
  }
  assert.doesNotMatch(css, /\.sector-journey-grid|\.sector-preview\{/);
  assert.match(css, /\.feng-shui-heading>span\{display:inline-grid/);
});
