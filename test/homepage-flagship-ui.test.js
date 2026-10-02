import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("public/index.html","utf8");
const css=fs.readFileSync("public/style.css","utf8");
const canonicalGate=fs.readFileSync(".github/workflows/homepage-canonical-verify.yml","utf8");
const heroCarousel=fs.readFileSync("public/hero-carousel.js","utf8");

test("homepage keeps premium Vietnamese copy and no duplicated greeting",()=>{
  assert.match(html,/Vượt trên<br><em>xa xỉ\.<\/em>/);
  assert.match(html,/hero-carousel/);
  for (const sector of ['auto','yacht','jet','energy']) assert.match(html,new RegExp(`id="hero-slide-${sector}"`));
  assert.match(html,/data-src="\/media\/editorial\/green-energy\/wide_clean_modern_promotional_banner_hero_image\.png"/);
  assert.match(html,/class="hero-slide-energy-link" href="\/green-energy"/);
  assert.doesNotMatch(html,/id="hero-slide-energy"[^]*?<div class="hero-slide-content">/);
  assert.doesNotMatch(html,/Intel_Solar_Installation_Vietnam\.jpg/);
  assert.doesNotMatch(html,/Intel Free Press/);
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
  assert.match(css,/#hero-slide-energy img\{object-fit:contain;object-position:center;background:#dcecf7\}/);
});

test("production homepage gate checks all four current hero sectors",()=>{
  for (const sector of ['auto','yacht','jet','energy']) {
    assert.ok(canonicalGate.includes(`grep -Fq 'id="hero-slide-${sector}"' /tmp/home.html`));
  }
  assert.doesNotMatch(canonicalGate,/BỘ SƯU TẬP RIÊNG/);
  assert.match(canonicalGate,/PHAN THUáº¦N XTRA/);
  assert.match(canonicalGate,/data-catalog-hero="lexus-rx500h-2024"/);
  assert.match(canonicalGate,/Kevauto/);
  assert.match(canonicalGate,/2022_Lexus_LX600_F_Sport/);
  assert.match(canonicalGate,/Retired Lexus LX600\/Kevauto automotive hero is still present in production/);
});


test("automotive hero resolves the live Lexus RX500h 2024 catalog image",()=>{
  assert.match(html,/data-catalog-hero="lexus-rx500h-2024"/);
  assert.match(html,/alt="LEXUS RX500h F SPORT PERFORMANCE 2024 đang bán tại PHAN THUẦN XTRA"/);
  assert.doesNotMatch(html,/Kevauto/);
  assert.doesNotMatch(html,/creativecommons\.org\/licenses\/by-sa\/4\.0/);
  assert.doesNotMatch(html,/2022_Lexus_LX600_F_Sport/);

  assert.match(heroCarousel,/fetch\('\/api\/cars', \{ cache: 'no-store', credentials: 'same-origin' \}\)/);
  assert.match(heroCarousel,/brand === 'lexus' && name\.includes\('rx500h'\) && year === '2024'/);
  assert.match(heroCarousel,/rx500h\?\.cover_image \?\? rx500h\?\.image/);
  assert.match(heroCarousel,/catalogHero\.src = image/);
  assert.match(heroCarousel,/querySelectorAll\('\.hero-slide'\)/);
  assert.match(heroCarousel,/window\.setInterval\(\(\) => show\(current \+ 1\), 6500\)/);
});
