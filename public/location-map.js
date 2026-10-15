(() => {
  "use strict";
  const section = document.getElementById("visit-map");
  if (!section) return;
  const frame = section.querySelector("[data-map-frame]");
  const buttons = [...section.querySelectorAll("[data-map-size]")];
  if (!frame || !buttons.length) return;
  const allowed = new Set(["compact", "standard", "wide"]);
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const size = button.dataset.mapSize;
      if (!allowed.has(size)) return;
      frame.dataset.size = size;
      for (const item of buttons) {
        item.setAttribute("aria-pressed", String(item === button));
      }
    });
  }
})();
