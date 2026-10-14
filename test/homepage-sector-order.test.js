import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

test('homepage follows hero -> 01..05 -> founder -> ecosystem -> booking -> blog -> contact', () => {
  const selectors = [
    'class="hero hero-xtra"',
    'id="cars-section"',
    'id="sector-journey"',
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
    assert.ok(position > previous, `section ${selector} is missing or out of order`);
    previous = position;
  }
});

test('the 02–04 editorial sector strip uses the same numbering as the five hero slides', () => {
  const journey = html.match(/<section class="section sector-journey"[^]*?<\/section>/)?.[0] || '';
  assert.ok(journey);
  const headings = [...journey.matchAll(/<span>(0[234] \/ [^<]+)<\/span>/g)].map(match => match[1]);
  assert.deepEqual(headings, [
    '02 / DU THUYỀN CHÂU ÂU',
    '03 / CHUYÊN CƠ THƯƠNG GIA',
    '04 / NĂNG LƯỢNG XANH',
  ]);
  for (const link of ['/yachts', '/business-jets', '/green-energy']) {
    assert.ok(journey.includes(`href="${link}"`), `missing sector link ${link}`);
  }
  assert.match(html, /id="hero-slide-auto"/);
  assert.match(html, /id="hero-slide-yacht"/);
  assert.match(html, /id="hero-slide-jet"/);
  assert.match(html, /id="hero-slide-energy"/);
  assert.match(html, /id="hero-slide-feng-shui"/);
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

test('three sector previews are responsive, accessible, and preserve legacy anchors', () => {
  assert.match(css, /\.sector-journey-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:560px\)\{\.sector-preview>a\{display:flex\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.sector-preview/);
  for (const id of ['cars-section','sector-journey','ai-assistant','about-phan-thuan','ecosystem','test-drive','blog','contact']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `duplicate anchor ${id}`);
  }
});
