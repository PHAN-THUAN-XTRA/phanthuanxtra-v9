import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("public/index.html","utf8");
const css=fs.readFileSync("public/style.css","utf8");

test("homepage keeps premium Vietnamese copy and no duplicated greeting",()=>{
  assert.match(html,/Vượt trên<br><em>xa xỉ\.<\/em>/);
  assert.match(html,/BỘ SƯU TẬP RIÊNG/);
  assert.match(html,/HỆ SINH THÁI XTRA/);\n    assert.match(html,/PHAN THUẦN XTRA • VIỆT NAM/);\n    assert.match(html,/01 \/ Ô TÔ CAO CẤP/);\n    assert.match(html,/CHUYÊN CƠ THƯƠNG GIA/);
  assert.match(html,/Xin chào\. Tôi tư vấn/);
  assert.doesNotMatch(html,/Xin chào\. Xin chào\./);
});

test("flagship palette preserves obsidian emerald and gold tokens",()=>{
  assert.match(css,/--obsidian:#050706/);
  assert.match(css,/--emerald:#0f5f50/);
  assert.match(css,/--gold:#c7a35a/);
  assert.match(css,/Flagship tri-color discipline/);\n    assert.match(css,/Vietnamese typography consistency/);\n    assert.doesNotMatch(css,/family=Manrope/);\n    assert.match(css,/AI chat inherits the same Vietnamese UI typography/);
});
