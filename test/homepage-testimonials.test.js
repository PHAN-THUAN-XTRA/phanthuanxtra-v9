import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');
const js = fs.readFileSync('public/testimonials.js', 'utf8');

test('the feedback entry appears immediately below the PHAN THUẦN XTRA • VIỆT NAM eyebrow', () => {
  const brand = '<p class="eyebrow">PHAN THUẦN XTRA • VIỆT NAM</p>';
  const teaser = '<a class="hero-testimonials-link" href="#khach-hang-chia-se"';
  assert.ok(html.includes(brand + teaser));
  assert.match(html, /LỜI CHIA SẺ • TRẢI NGHIỆM RIÊNG <span aria-hidden="true">↘<\/span><\/a><h1>Vượt trên/);
  assert.match(css, /\.hero-testimonials-link:focus-visible/);
});

test('the full testimonial carousel sits directly below the opening hero, above sector 01', () => {
  const hero = html.indexOf('<section class="hero hero-xtra">');
  const carousel = html.indexOf('<section class="section xtra-testimonials" id="khach-hang-chia-se"');
  const cars = html.indexOf('<section class="section" id="cars-section">');
  const feng = html.indexOf('<section class="section ai-section feng-shui-section"');
  const founder = html.indexOf('id="about-phan-thuan"');
  assert.ok(hero >= 0 && carousel > hero && cars > carousel && feng > cars && founder > feng);
  const beforeCarousel = html.slice(hero, carousel);
  assert.match(beforeCarousel, /<\/div><\/div><\/section>\s*$/);
  const section = html.slice(carousel, cars);
  assert.match(section, /<\/section>\s*$/);
  assert.equal((section.match(/class="xtra-testimonial-card"/g) || []).length, 10);
  assert.equal((section.match(/<blockquote>/g) || []).length, 10);
  assert.equal((html.match(/id="khach-hang-chia-se"/g) || []).length, 1);
  assert.match(section, /Chuyến Legacy từ TP.HCM ra Đà Nẵng/);
  assert.match(section, /du thuyền châu Âu ngay tại Sài Gòn/);
  assert.match(section, /Sở hữu biển số mình yêu thích/);
  assert.match(section, /Đồng hành SAU GIAO DỊCH/i);
  assert.match(section, /Phản hồi được đăng với sự đồng ý của khách hàng/);
  assert.match(section, /thông tin nhận diện được lược bỏ/);
  assert.doesNotMatch(section, /tel:|\+84\d{7,}/);
});

test('testimonial carousel remains keyboard-friendly, swipeable and motion-aware', () => {
  assert.match(html, /id="xtra-testimonials-track"[^>]*tabindex="0"/);
  assert.match(html, /class="xtra-testimonials-prev"[^>]*aria-controls="xtra-testimonials-track"/);
  assert.match(html, /class="xtra-testimonials-next"[^>]*aria-controls="xtra-testimonials-track"/);
  assert.match(html, /src="\/testimonials.js" defer/);
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(css, /max-width:650px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /window\.setInterval\(\(\) => navigate\(1\), 6500\)/);
  assert.match(js, /document\.hidden/);
  assert.match(js, /focusin/);
});
