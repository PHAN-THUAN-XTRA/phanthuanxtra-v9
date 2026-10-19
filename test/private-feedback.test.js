import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync(new URL('../public/private-feedback.js', import.meta.url), 'utf8');
function el(props = {}) {
  return Object.assign({ events: {}, attrs: {}, addEventListener(n, fn) { this.events[n] = fn; }, setAttribute(n, v) { this.attrs[n] = v; } }, props);
}
function setup(reduced = false) {
  let next = 1; const pending = new Map();
  const copy = el({ offsetLeft: 3580 });
  const list = el({ offsetLeft: 0, cloneNode() { return copy; } });
  const track = { append(e) { this.copy = e; } };
  const viewport = el({ scrollLeft: 0 }); const button = el({ hidden: true });
  const motion = el({ matches: reduced });
  const section = { querySelector(s) { return ({ '.feedback-viewport': viewport, '.feedback-track': track, '.feedback-list': list, '.feedback-pause': button })[s]; } };
  const document = el({ hidden: false, getElementById() { return section; } });
  vm.runInNewContext(code, { document, window: { matchMedia() { return motion; } }, requestAnimationFrame(fn) { const id = next++; pending.set(id, fn); return id; }, cancelAnimationFrame(id) { pending.delete(id); } });
  return { copy, viewport, button, motion, document, pending, step(t) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(t)); } };
}
test('feedback autoplay supports reading pause, resume, focus and visibility', () => {
  const s = setup();
  assert.equal(s.button.hidden, false);
  s.step(100); s.step(200); assert.ok(s.viewport.scrollLeft > 0);
  s.button.events.click(); const old = s.viewport.scrollLeft;
  s.step(300); assert.equal(s.viewport.scrollLeft, old);
  s.button.events.click(); s.viewport.events.pointerdown(); assert.equal(s.button.attrs['aria-pressed'], 'true');
  s.button.events.click(); s.viewport.events.focusin(); assert.equal(s.pending.size, 0);
  s.viewport.events.focusout(); assert.equal(s.pending.size, 1);
  s.document.hidden = true; s.document.events.visibilitychange(); assert.equal(s.pending.size, 0);
});
test('reduced motion starts paused and duplicated content is inert', () => {
  const s = setup(true); s.step(100); s.step(200);
  assert.equal(s.viewport.scrollLeft, 0);
  assert.equal(s.button.attrs['aria-pressed'], 'true');
  assert.equal(s.copy.attrs['aria-hidden'], 'true'); assert.ok('inert' in s.copy.attrs);
  s.button.events.click(); s.motion.events.change({ matches: true }); assert.equal(s.button.attrs['aria-pressed'], 'true');
});
test('feedback homepage preserves ten anonymous cards, privacy text and section order', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const start = html.indexOf('id="private-feedback"');
  assert.ok(start > html.indexOf('id="ai-assistant"') && start < html.indexOf('id="about-phan-thuan"'));
  const section = html.slice(start, html.indexOf('id="about-phan-thuan"'));
  assert.equal((section.match(/class="feedback-card"/g) || []).length, 10);
  assert.ok(section.includes('Phản hồi được đăng với sự đồng ý của khách hàng; thông tin nhận diện được lược bỏ để tôn trọng quyền riêng tư.'));
  assert.ok(!section.includes('bản nháp'));
  assert.ok(!section.includes('tel:'));
});
