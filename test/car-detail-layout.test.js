import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("public/car.html","utf8");

test("car detail preserves owner-reviewed line breaks",()=>{
  assert.match(html,/vehicle-description/);
  assert.match(html,/white-space:pre-line/);
});

test("car detail renders persisted gallery order including cover",()=>{
  assert.match(html,/const gallery=imgs/);
  assert.match(html,/const cover=c\.cover_image\|\|gallery\[0\]\|\|''/);
  assert.doesNotMatch(html,/galleryOrder=/);
  assert.doesNotMatch(html,/id==='tg-714'/);
  assert.doesNotMatch(html,/gallery=imgs\.filter\(x=>x!==cover\)/);
  assert.match(html,/vehicle-gallery-grid/);
  assert.match(html,/Hình ảnh chi tiết/);
  assert.match(html,/ảnh '\+\(i\+1\)/);
});

test("car detail has no model-specific gallery override",()=>{
  assert.doesNotMatch(html,/tg-714/);
  assert.match(html,/Hình ảnh chi tiết \(\$\{gallery\.length\} ảnh\)/);
});

test("car detail has responsive desktop and mobile layout contracts",()=>{
  assert.match(html,/\.detail\{padding:48px 0 72px\}/);
  assert.match(html,/\.detail-grid\{display:grid;grid-template-columns:minmax\(0,1\.15fr\) minmax\(320px,\.85fr\)/);
  assert.match(html,/\.vehicle-gallery-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/@media\(max-width:900px\)[\s\S]*?\.detail-grid\{grid-template-columns:1fr;gap:28px\}/);
  assert.match(html,/@media\(max-width:760px\)[\s\S]*?\.vehicle-gallery-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px\}/);
  assert.match(html,/@media\(max-width:420px\)\{\.vehicle-gallery-grid\{grid-template-columns:1fr\}\}/);
});


test("tg-811 uses the evidence-backed Phantom VII Sedan title",()=>{
  assert.match(html,/displayName=String\(c\.id\)==='tg-811'\?'Rolls-Royce Phantom VII 2009 – Sedan Siêu Sang V12 6\.75L'/);
  assert.match(html,/el\('h1','',displayName\)/);
});


test("tg-811 title propagates to document metadata, booking context, and gallery alt text",()=>{
  assert.match(html,/displayTitle=String\(c\.id\)==='tg-811'\?displayName:/);
  assert.match(html,/document\.title=displayTitle\+' \| PHAN THUẦN XTRA'/);
  assert.match(html,/name:displayTitle\.trim\(\)/);
  assert.match(html,/img\.alt=displayTitle\+' — ảnh '/);
});
