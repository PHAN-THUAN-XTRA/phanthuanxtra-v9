/* PHAN THUẦN XTRA: accessible image viewer for vehicle detail and blog articles. */
(() => {
  "use strict";
  // Support persisted galleries rendered by older vehicle HTML templates, too.
  const selector = "a[data-ptx-image-viewer], .vehicle-gallery-grid a[href], .vehicle-cover-zoom[href]";
  let dialog = null;
  let photo = null;
  let caption = null;
  let counter = null;
  let previous = null;
  let next = null;
  let closeButton = null;
  let images = [];
  let current = 0;
  let lastFocus = null;
  let oldOverflow = "";
  let touchStart = null;

  function validUrl(anchor) {
    try {
      const url = new URL(anchor.getAttribute("href") || "", location.href);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
      return url.href;
    } catch { return null; }
  }
  function enhanceVehicleGallery() {
    const root = document.getElementById("vehicleDetail");
    if (!root) return;
    root.querySelectorAll(".vehicle-gallery-grid a[href], .vehicle-cover-zoom[href]").forEach(anchor => {
      if (validUrl(anchor) && !anchor.hasAttribute("data-ptx-image-viewer")) {
        anchor.setAttribute("data-ptx-image-viewer", "");
      }
    });
    // Backwards compatibility for detail templates rendering a bare hero <img>.
    const visual = root.querySelector(".detail-grid > div:first-child");
    const image = visual && Array.from(visual.children).find(node => node.tagName === "IMG");
    if (image && image.src && !image.closest("a")) {
      const anchor = document.createElement("a");
      anchor.className = "vehicle-cover-zoom";
      anchor.href = image.currentSrc || image.src;
      anchor.setAttribute("data-ptx-image-viewer", "");
      anchor.setAttribute("aria-label", "Xem ảnh bìa phóng to");
      image.replaceWith(anchor);
      anchor.append(image);
    }
  }
  const detailRoot = document.getElementById("vehicleDetail");
  if (detailRoot) {
    new MutationObserver(enhanceVehicleGallery).observe(detailRoot, { childList: true, subtree: true });
    enhanceVehicleGallery();
  }
  function gallery() {
    const seen = new Set();
    const result = [];
    document.querySelectorAll(selector).forEach(anchor => {
      const url = validUrl(anchor);
      if (!url || seen.has(url)) return;
      seen.add(url);
      const img = anchor.querySelector("img");
      result.push({
        url,
        alt: (img?.alt || anchor.getAttribute("aria-label") || "Ảnh chi tiết").trim()
      });
    });
    return result;
  }
  function createViewer() {
    if (dialog) return;
    dialog = document.createElement("div");
    dialog.className = "ptx-image-viewer";
    dialog.hidden = true;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Xem ảnh phóng to");
    dialog.tabIndex = -1;

    const stage = document.createElement("div");
    stage.className = "ptx-image-viewer__stage";
    stage.setAttribute("aria-live", "off");

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ptx-image-viewer__close";
    closeButton.textContent = "Đóng ×";
    closeButton.setAttribute("aria-label", "Đóng ảnh phóng to");

    photo = document.createElement("img");
    photo.className = "ptx-image-viewer__photo";
    photo.alt = "";

    previous = document.createElement("button");
    previous.type = "button";
    previous.className = "ptx-image-viewer__arrow ptx-image-viewer__arrow--prev";
    previous.textContent = "‹";
    previous.setAttribute("aria-label", "Ảnh trước");

    next = document.createElement("button");
    next.type = "button";
    next.className = "ptx-image-viewer__arrow ptx-image-viewer__arrow--next";
    next.textContent = "›";
    next.setAttribute("aria-label", "Ảnh tiếp theo");

    const footer = document.createElement("div");
    footer.className = "ptx-image-viewer__footer";
    caption = document.createElement("span");
    caption.className = "ptx-image-viewer__caption";
    counter = document.createElement("span");
    counter.className = "ptx-image-viewer__counter";
    counter.setAttribute("aria-live", "polite");

    footer.append(caption, counter);
    stage.append(photo, previous, next, closeButton, footer);
    dialog.append(stage);
    document.body.append(dialog);

    previous.addEventListener("click", () => show(current - 1));
    next.addEventListener("click", () => show(current + 1));
    closeButton.addEventListener("click", hide);
    dialog.addEventListener("click", event => {
      if (event.target === dialog || event.target === stage) hide();
    });
    stage.addEventListener("touchstart", event => {
      if (event.touches.length !== 1) { touchStart = null; return; }
      touchStart = {x: event.touches[0].clientX, y: event.touches[0].clientY};
    }, {passive:true});
    stage.addEventListener("touchend", event => {
      if (!touchStart || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (images.length > 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        show(current + (dx < 0 ? 1 : -1));
      }
    }, {passive:true});
  }
  function show(index) {
    if (!images.length || !dialog) return;
    current = (index + images.length) % images.length;
    const selected = images[current];
    photo.src = selected.url;
    photo.alt = selected.alt;
    caption.textContent = selected.alt;
    counter.textContent = (current + 1) + " / " + images.length;
    previous.hidden = next.hidden = images.length < 2;
  }
  function open(anchor) {
    const url = validUrl(anchor);
    if (!url) return;
    const options = gallery();
    const index = options.findIndex(item => item.url === url);
    if (index < 0) return;
    createViewer();
    images = options;
    lastFocus = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.hidden = false;
    show(index);
    closeButton.focus();
  }
  function hide() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    photo.removeAttribute("src");
    document.body.style.overflow = oldOverflow;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest(selector) : null;
    if (!anchor || !validUrl(anchor)) return;
    event.preventDefault();
    open(anchor);
  });
  document.addEventListener("keydown", event => {
    if (!dialog || dialog.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); hide(); }
    else if (event.key === "ArrowLeft" && images.length > 1) { event.preventDefault(); show(current - 1); }
    else if (event.key === "ArrowRight" && images.length > 1) { event.preventDefault(); show(current + 1); }
    else if (event.key === "Tab") {
      // Keep keyboard focus inside the modal while it is open.
      const focusable = [previous, next, closeButton].filter(button => !button.hidden);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  });
})();
