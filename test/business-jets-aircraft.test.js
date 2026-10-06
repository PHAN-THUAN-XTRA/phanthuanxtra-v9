import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../public/business-jets.html", import.meta.url), "utf8");
const editorialHtml = fs.readFileSync(new URL("../public/__ptx_editorial__/business-jets.html", import.meta.url), "utf8");

test("business-jets identifies the currently operated Legacy 600 reference aircraft", () => {
  for (const source of [html, editorialHtml]) {
    assert.match(source, /Aircraft đang khai thác/);
    assert.match(source, /Embraer Legacy 600/);
    assert.match(source, /EMB-135BJ \/ Legacy 600 \(ERJ-135BJ\)/);
    assert.match(source, /VN-A268/);
    assert.match(source, /E35L/);
  }
});

test("business-jets aligns SEO copy with Legacy 600 VN-A268", () => {
  assert.match(html, /<title>Business Jets & Private Aviation \| Legacy 600 VN-A268 \| PHAN THUẦN XTRA<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]*VN-A268[^"]*">/);
  assert.match(html, /<meta property="og:title" content="Embraer Legacy 600 VN-A268/);
});

test("business-jets keeps per-trip verification language", () => {
  assert.match(html, /khả năng sẵn sàng, lịch bay, tải trọng, hành trình bay thẳng và giá charter vẫn phải được xác nhận/);
  assert.match(html, /Sức chứa, cabin, hành lý, tải trọng và trang bị được xác nhận theo aircraft\/operator của từng chuyến/);
});
