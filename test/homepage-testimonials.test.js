import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');
const js = fs.readFileSync('public/testimonials.js', 'utf8');

test('10 approved anonymous testimonials appear immediately after section 05', () => {
  const feng = html.indexOf('id="ai-assistant"');
  const testimonial = html.indexOf('id="khach-hang-chia-se"');
  const founder = html.indexOf('id="about-phan-thuan"');
  assert.ok(feng >= 0 && testimonial > feng && founder > testimonial);
  const section = html.slice(testimonial, founder);
  assert.equal((section.match(/class="xtra-testimonial-card"/g) || []).length, 10);
  assert.equal((section.match(/<blockquote>/g) || []).length, 10);
  assert.match(section, /Chuyến Legacy từ TP.HCM ra Đà Nẵng/);
  assert.match(section, /du thuyền châu Âu ngay tại Sài Gòn/);
  assert.match(section, /Sở hữu biển số mình yêu thích/);
  assert.match(section, /Đồng hành SAU GIAO DỊCH/i);
  assert.match(section, /Phản hồi được đăng với sự đồng ý của khách hàng/);
  assert.match(section, /thông tin nhận diện được lược bỏ/);
  assert.doesNotMatch(section, /tel:|\+84\d{7,}/);
});

test('testimonial carousel is usable by keyboard, swipe and reduced-motion preferences', () => {
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
