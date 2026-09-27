import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const blog=fs.readFileSync("src/blog.js","utf8");
const cards=fs.readFileSync("public/blog-cards.js","utf8");
const css=fs.readFileSync("public/style.css","utf8");

test("Blog uses shared Vietnamese flagship typography and accented labels",()=>{
  assert.match(blog,/stylesheet" href="\/style\.css"/);
  assert.match(blog,/Bài viết mới nhất/);
  assert.match(blog,/Ô tô cao cấp • Phong cách sống • Hệ sinh thái AI/);
  assert.match(cards,/Đánh giá & Trải nghiệm/);
  assert.match(cards,/Phan Thuần/);
  assert.doesNotMatch(blog,/font:[^\n}]*system-ui/);
  assert.match(css,/\.blog-page[\s\S]*Be Vietnam Pro/);
  assert.match(css,/\.blog-page h1,[\s\S]*Noto Serif Display/);
  assert.match(css,/@media\(max-width:800px\)[\s\S]*\.blog-grid\{grid-template-columns:1fr\}/);
});
