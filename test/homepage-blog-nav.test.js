import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("public/index.html","utf8");

test("homepage primary navigation exposes Blog at /blog",()=>{
  const nav=html.match(/<nav id="site-nav"[\s\S]*?<\/nav>/)?.[0]||"";
  assert.match(nav,/<a href="\/blog">Blog<\/a>/);
});

test("adding Blog preserves primary navigation and hotline",()=>{
  const nav=html.match(/<nav id="site-nav"[\s\S]*?<\/nav>/)?.[0]||"";
  for(const item of [
    '<a href="#cars-section">Xe cao cấp</a>',
    '<a href="#about-phan-thuan">Đặc quyền</a>',
    '<a href="#ecosystem">Hệ sinh thái</a>',
    '<a href="#ai-assistant">AI</a>',
    '<a href="#contact">Liên hệ</a>'
  ]) assert.ok(nav.includes(item),`missing navigation item: ${item}`);
  assert.match(html,/<a class="hotline" href="tel:\+84866997891">0866 997 891<\/a>/);
});
