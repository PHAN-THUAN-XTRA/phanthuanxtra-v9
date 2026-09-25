import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../public/yachts.html", import.meta.url), "utf8");

test("yachts landing page has canonical SEO metadata and semantic headings", () => {
  assert.match(html, /<title>Du Thuyền Cao Cấp & Hạng Sang \| Jeanneau, Prestige, Riva \| Phan Thuần Xtra<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/phanthuanxtra\.com\/yachts">/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<h1>Du Thuyền Cao Cấp &amp; Hạng Sang/);
  assert.match(html, /<h2>Ferretti Group – Hệ sinh thái du thuyền hạng sang Ý<\/h2>/);
  assert.match(html, /<h2>Liên hệ tư vấn<\/h2>/);
});

test("yachts landing page exposes aligned FAQ structured data", () => {
  assert.match(html, /"@type":"FAQPage"/);
  for (const question of [
    "Du thuyền cao cấp là gì?",
    "Phan Thuần Xtra tư vấn những thương hiệu du thuyền nào?",
    "Ferretti Yachts, Pershing và Riva có cùng tập đoàn không?",
    "Catamaran khác gì du thuyền một thân?",
    "Nên chọn du thuyền theo tiêu chí nào?"
  ]) {
    assert.ok(html.includes(question), `missing FAQ question: ${question}`);
  }
});
