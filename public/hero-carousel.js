const catalogHero = document.querySelector('[data-catalog-hero="lexus-rx500h-2024"]');
if (catalogHero) {
  fetch('/api/cars', { cache: 'no-store', credentials: 'same-origin' })
    .then(response => {
      if (!response.ok) throw new Error('catalog unavailable');
      return response.json();
    })
    .then(data => {
      const cars = Array.isArray(data?.cars) ? data.cars : [];
      const rx500h = cars.find(car => {
        const brand = String(car?.brand ?? '').toLowerCase();
        const name = String(car?.name ?? car?.model ?? '').toLowerCase();
        const year = String(car?.year ?? '');
        return brand === 'lexus' && name.includes('rx500h') && year === '2024';
      });
      const image = rx500h?.cover_image ?? rx500h?.image ?? '';
      if (!image) throw new Error('RX500h 2024 image unavailable');
      catalogHero.src = image;
      const listingName = String(rx500h?.name ?? rx500h?.model ?? 'LEXUS RX500h F SPORT PERFORMANCE 2024').trim();
      catalogHero.alt = `${listingName} đang bán tại PHAN THUẦN XTRA`;
    })
    .catch(() => {
      catalogHero.closest('.hero-slide')?.classList.add('hero-catalog-image-unavailable');
    });
}

const carousel = document.querySelector('.hero-carousel');
if (carousel) {
  const slides = [...carousel.querySelectorAll('.hero-slide')];
  const controls = [...carousel.querySelectorAll('[data-slide]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let timer;

  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== current;
      slide.classList.toggle('is-active', i === current);
    });
    const image = slides[current].querySelector('img[data-src]');
    if (image) {
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
    }
    controls.forEach((button, i) => {
      button.classList.toggle('is-active', i === current);
      button.setAttribute('aria-pressed', String(i === current));
    });
  }

  function stop() { window.clearInterval(timer); timer = undefined; }
  function start() {
    stop();
    if (!reducedMotion.matches && !document.hidden && !carousel.matches(':hover') && !carousel.contains(document.activeElement)) {
      timer = window.setInterval(() => show(current + 1), 6500);
    }
  }

  controls.forEach(button => button.addEventListener('click', () => {
    show(Number(button.dataset.slide));
    start();
  }));
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', () => window.setTimeout(start, 0));
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
  start();
}
