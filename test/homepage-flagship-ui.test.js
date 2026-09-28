import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("public/index.html","utf8");
const css=fs.readFileSync("public/style.css","utf8");

test("homepage keeps premium Vietnamese copy and no duplicated greeting",()=>{
  assert.match(html,/Vượt trên<br><em>xa xỉ\.<\/em>/);
  assert.match(html,/hero-carousel/);
  for (const sector of ['auto','yacht','jet','energy']) assert.match(html,new RegExp(`id="hero-slide-${sector}"`));
  assert.match(html,/href="#test-drive">Đặt lịch tư vấn xe/);
  assert.match(html,/href="\/business-jets#flight-request">Gửi yêu cầu chuyến bay/);
  assert.match(html,/HỆ SINH THÁI XTRA/);
  assert.match(html,/PHAN THUẦN XTRA • VIỆT NAM/);
  assert.match(html,/01 \/ Ô TÔ CAO CẤP/);
  assert.match(html,/Chuyên cơ<br>thương gia/);
  assert.match(html,/Xin chào\. Tôi tư vấn/);
  assert.doesNotMatch(html,/Xin chào\. Xin chào\./);
  assert.match(html,/Mở trợ lý AI →/);
  assert.match(html,/Anh\/chị đang quan tâm điều gì\?/);
  assert.match(html,/aria-label="Gửi tin nhắn"/);
  assert.match(html,/data-filter="sport" type="button">Thể thao<\/button>/);
  assert.match(html,/Điện mặt trời • Giải pháp năng lượng xanh/);
  assert.match(html,/Nhà sáng lập PHAN THUẦN XTRA/);
  assert.match(html,/Trợ lý AI tư vấn toàn bộ nội dung chính thức đang có trên website và ưu tiên thông tin hiện hành/);
  assert.doesNotMatch(html,/id="green-energy"/);
  assert.doesNotMatch(html,/id="yacht"/);
  assert.doesNotMatch(html,/id="business-jet"/);
  assert.doesNotMatch(html,/id="services"/);
  assert.doesNotMatch(html,/Năng lượng sạch cho tương lai\./);
  assert.doesNotMatch(html,/Biển rộng\. Trải nghiệm riêng\./);
  assert.doesNotMatch(html,/Thời gian là tài sản xa xỉ nhất\./);
  assert.doesNotMatch(html,/Đồng hành từ ý tưởng đến trải nghiệm\./);
});

test("flagship palette preserves obsidian emerald and gold tokens",()=>{
  assert.match(css,/--obsidian:#050706/);
  assert.match(css,/--emerald:#0f5f50/);
  assert.match(css,/--gold:#c7a35a/);
  assert.match(css,/Flagship tri-color discipline/);
  assert.match(css,/Vietnamese typography consistency/);
  assert.doesNotMatch(css,/Manrope/);
  assert.match(css,/AI chat inherits the same Vietnamese UI typography/);
});
