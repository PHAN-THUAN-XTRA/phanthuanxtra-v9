// Keep the automotive slide synchronized with the PUBLIC, available inventory.
// Porsche 718 Boxster 2024 is preferred, but hidden/sold cars are never promoted.
const catalogHero = document.querySelector('[data-catalog-hero="available-stock"]');
if (catalogHero) {
  const slide = catalogHero.closest('.hero-slide');
  const badge = slide?.querySelector('[data-catalog-brand]');
  const model = slide?.querySelector('[data-catalog-model]');
  const imageUrl = car => {
    const photos = Array.isArray(car?.images) ? car.images : [];
    return [car?.cover_image, car?.image, photos.find(x => x?.is_cover)?.url, photos[0]?.url]
      .find(value => typeof value === 'string' && (/^\/(?!\/)/.test(value) || /^https:\/\//i.test(value))) || '';
  };
  const isAvailable = car => String(car?.status ?? car?.tag ?? '').trim().toLowerCase() === 'available' && Boolean(imageUrl(car));
  const isPorsche = car => {
    const name = String(car?.name ?? car?.model ?? '');
    return String(car?.brand ?? '').trim().toLowerCase() === 'porsche'
      && /718[\s-]*boxster/i.test(name)
      && (String(car?.year ?? '') === '2024' || name.includes('2024'));
  };
  function reset() {
    catalogHero.hidden = true;
    catalogHero.removeAttribute('src');
    catalogHero.alt = '';
    if (badge) {badge.hidden = true; badge.textContent = '';}
    if (model) {model.hidden = true; model.textContent = '';}
  }
  function showAvailable(cars, index = 0) {
    if (index >= cars.length) {
      reset();
      slide?.classList.add('hero-catalog-image-unavailable');
      return;
    }
    const car = cars[index];
    catalogHero.onload = () => {
      const preferred = isPorsche(car);
      const brand = String(car.brand || '').trim().toUpperCase();
      const category = String(car.category || '').toLowerCase();
      const type = ({convertible:'Convertible',suv:'SUV',sedan:'Sedan',coupe:'Coupe',mpv:'MPV',sport:'Thể thao'})[category] || 'Xe cao cấp';
      const title = preferred
        ? '718 BOXSTER 2024 | RACING YELLOW | MÂM ĐEN CỰC CHẤT'
        : String(car.name ?? car.model ?? '').trim();
      catalogHero.alt = brand + ' ' + title + ' đang bán tại PHAN THUẦN XTRA';
      catalogHero.hidden = false;
      if (badge) {badge.textContent = brand + ' • ' + (preferred ? 'Convertible' : type); badge.hidden = false;}
      if (model) {model.textContent = title; model.hidden = false;}
      slide?.classList.remove('hero-catalog-image-unavailable');
    };
    catalogHero.onerror = () => {
      catalogHero.onload = null;
      catalogHero.onerror = null;
      reset();
      showAvailable(cars, index + 1);
    };
    catalogHero.src = imageUrl(car);
  }
  reset();
  fetch('/api/cars', {cache:'no-store',credentials:'same-origin'})
    .then(response => {
      if (!response.ok) throw Error('catalog unavailable');
      return response.json();
    })
    .then(data => {
      const cars = (Array.isArray(data?.cars) ? data.cars : []).filter(isAvailable);
      const preferred = cars.find(isPorsche);
      showAvailable(preferred ? [preferred, ...cars.filter(car => car !== preferred)] : cars);
    })
    .catch(() => {
      reset();
      slide?.classList.add('hero-catalog-image-unavailable');
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
    const activeSlide = slides[current];
    activeSlide.querySelectorAll('source[data-srcset]').forEach(source => {
      source.srcset = source.dataset.srcset;
      source.removeAttribute('data-srcset');
    });
    const image = activeSlide.querySelector('img[data-src]');
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
