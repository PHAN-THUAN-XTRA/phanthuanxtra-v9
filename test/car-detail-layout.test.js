import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("public/car.html","utf8");

test("car detail preserves owner-reviewed line breaks",()=>{
  assert.match(html,/vehicle-description/);
  assert.match(html,/white-space:pre-line/);
});

test("car detail renders the complete gallery including cover",()=>{
  assert.match(html,/gallery=imgs,features=/);
  assert.doesNotMatch(html,/gallery=imgs\.filter\(x=>x!==cover\)/);
  assert.match(html,/vehicle-gallery-grid/);
  assert.match(html,/Hình ảnh chi tiết/);
  assert.match(html,/ảnh '\+\(i\+1\)/);
});

test("car detail has responsive desktop and mobile layout contracts",()=>{
  assert.match(html,/\.detail\{padding:48px 0 72px\}/);
  assert.match(html,/\.detail-grid\{display:grid;grid-template-columns:minmax\(0,1\.15fr\) minmax\(320px,\.85fr\)/);
  assert.match(html,/\.vehicle-gallery-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/@media\(max-width:900px\)[\s\S]*?\.detail-grid\{grid-template-columns:1fr;gap:28px\}/);
  assert.match(html,/@media\(max-width:760px\)[\s\S]*?\.vehicle-gallery-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px\}/);
  assert.match(html,/@media\(max-width:420px\)\{\.vehicle-gallery-grid\{grid-template-columns:1fr\}\}/);
});
