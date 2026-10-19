/* Progressive enhancement: native scrolling works without JavaScript. */
(() => {
  'use strict';
  const section = document.getElementById('private-feedback');
  if (!section) return;
  const viewport = section.querySelector('.feedback-viewport');
  const track = section.querySelector('.feedback-track');
  const list = section.querySelector('.feedback-list');
  const button = section.querySelector('.feedback-pause');
  if (!viewport || !track || !list || !button) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let hovering = false;
  let focused = false;
  let visible = false;
  let previous = 0;
  let frame = 0;
  let offset = 0;
  const copy = list.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('inert', '');
  track.append(copy);
  button.hidden = false;
  function syncButton() {
    button.textContent = paused ? 'Tiếp tục chuyển động' : 'Tạm dừng chuyển động';
    button.setAttribute('aria-pressed', String(paused));
  }
  function active() {
    return !paused && !hovering && !focused && visible && !document.hidden;
  }
  function tick(now) {
    frame = 0;
    if (!active()) { previous = 0; return; }
    const distance = copy.offsetLeft - list.offsetLeft;
    if (previous && distance > 0) {
      offset += Math.min(now - previous, 64) * 0.022;
      if (offset >= distance) offset %= distance;
      viewport.scrollLeft = offset;
    }
    previous = now;
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!active()) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    } else if (!frame) {
      offset = viewport.scrollLeft;
      frame = requestAnimationFrame(tick);
    }
  }
  function pauseForReading() { paused = true; syncButton(); schedule(); }
  button.addEventListener('click', () => { paused = !paused; syncButton(); schedule(); });
  viewport.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') { hovering = true; schedule(); }
  });
  viewport.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  viewport.addEventListener('pointerdown', pauseForReading);
  viewport.addEventListener('wheel', pauseForReading, { passive: true });
  viewport.addEventListener('focusin', () => { focused = true; schedule(); });
  viewport.addEventListener('focusout', () => { focused = false; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', event => {
    if (event.matches) pauseForReading();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      schedule();
    }).observe(section);
  } else { visible = true; }
  syncButton();
  schedule();
})();
