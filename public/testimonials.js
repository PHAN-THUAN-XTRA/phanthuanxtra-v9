/* Private client testimonial carousel: native swipe + accessible controls. */
(() => {
  const track = document.getElementById('xtra-testimonials-track');
  const previous = document.querySelector('.xtra-testimonials-prev');
  const next = document.querySelector('.xtra-testimonials-next');
  if (!track || !previous || !next) return;
  const cards = Array.from(track.querySelectorAll('.xtra-testimonial-card'));
  if (cards.length < 2) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let interval;
  let hovered = false;
  let focused = false;

  const gapStep = () => cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
  const navigate = (direction) => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    if (max < 2) return;
    const step = gapStep();
    const current = track.scrollLeft;
    if (direction > 0 && current >= max - 3) {
      track.scrollTo({left: 0, behavior: 'auto'});
    } else if (direction < 0 && current <= 3) {
      track.scrollTo({left: max, behavior: 'auto'});
    } else {
      track.scrollBy({left: direction * step, behavior: reducedMotion.matches ? 'auto' : 'smooth'});
    }
  };
  const refreshAutoplay = () => {
    window.clearInterval(interval);
    interval = undefined;
    if (!reducedMotion.matches && !document.hidden && !hovered && !focused) {
      interval = window.setInterval(() => navigate(1), 6500);
    }
  };

  previous.addEventListener('click', () => { navigate(-1); refreshAutoplay(); });
  next.addEventListener('click', () => { navigate(1); refreshAutoplay(); });
  const section = track.closest('.xtra-testimonials');
  section.addEventListener('mouseenter', () => { hovered = true; refreshAutoplay(); });
  section.addEventListener('mouseleave', () => { hovered = false; refreshAutoplay(); });
  section.addEventListener('focusin', () => { focused = true; refreshAutoplay(); });
  section.addEventListener('focusout', (event) => {
    if (!section.contains(event.relatedTarget)) { focused = false; refreshAutoplay(); }
  });
  document.addEventListener('visibilitychange', refreshAutoplay);
  reducedMotion.addEventListener('change', refreshAutoplay);
  window.addEventListener('pagehide', () => window.clearInterval(interval), {once: true});
  refreshAutoplay();
})();
