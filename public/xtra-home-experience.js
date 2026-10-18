// Homepage-exclusive XTRA interactive selection: public inventory only, no writes or AI usage.
import { normalizeCars, filterCars, safeImage, budgetFromPosition } from "./xtra-intelligent-ui.js";

const labels = {
  suv: "SUV / Crossover", sedan: "Sedan", coupe: "Coupe",
  convertible: "Convertible", mpv: "MPV", pickup: "Pickup",
  wagon: "Wagon", sport: "Xe thể thao", other: "Dòng xe khác"
};
const vnd = new Intl.NumberFormat("vi-VN");
const formatBudget = value => vnd.format(value / 1000000000) + " tỷ đồng";
const fmtPrice = price => price === null ? "Giá: Liên hệ" : vnd.format(price) + " đ";
const element = (tag, text, className) => {
  const result = document.createElement(tag);
  if (text !== undefined && text !== null) result.textContent = String(text);
  if (className) result.className = className;
  return result;
};

export function homeMatches(payload, category = "all", budget = 20000000000) {
  const cars = normalizeCars(payload);
  return filterCars(cars, { category, budget, includeUnpriced: true });
}

function vehicleCard(car) {
  const card = element("article", null, "xtra-home-card");
  const imageBox = element("div", null, "xtra-home-card-image");
  imageBox.append(element("span", "PHAN THUẦN XTRA"));
  const src = safeImage(car.image);
  if (src) {
    const photo = document.createElement("img");
    photo.src = src;
    photo.alt = car.brand + " " + car.name;
    photo.loading = "lazy";
    photo.decoding = "async";
    photo.addEventListener("error", () => photo.remove(), { once: true });
    imageBox.append(photo);
  }
  const content = element("div", null, "xtra-home-card-body");
  content.append(element("p", car.brand || "PHAN THUẦN XTRA", "xtra-home-card-brand"));
  content.append(element("h4", car.name || "Xe tuyển chọn"));
  content.append(element("p", [car.year, car.odo].filter(Boolean).join(" · "), "xtra-home-card-info"));
  content.append(element("strong", fmtPrice(car.price), "xtra-home-card-price"));
  const link = element("a", "Xem chi tiết xe ↗", "xtra-home-card-link");
  link.href = "/car.html?id=" + encodeURIComponent(car.id);
  content.append(link);
  card.append(imageBox, content);
  return card;
}

export function initHomeExperience() {
  const root = document.getElementById("xtra-home-cars");
  const category = document.getElementById("xtra-home-category");
  const budget = document.getElementById("xtra-home-budget");
  const budgetValue = document.getElementById("xtra-home-budget-value");
  const count = document.getElementById("xtra-home-count");
  if (!root || !category || !budget || !budgetValue || !count) return;

  let cars = [];
  let loaded = false;

  const display = () => {
    const budgetLimit = budgetFromPosition(budget.value);
    budgetValue.textContent = formatBudget(budgetLimit);
    budget.setAttribute("aria-valuetext", formatBudget(budgetLimit));
    const matches = filterCars(cars, {
      category: category.value,
      budget: budgetLimit,
      includeUnpriced: true
    });
    const inBudget = matches.filter(car => car.price !== null).length;
    const unknownPrice = matches.length - inBudget;
    count.textContent = !loaded ? "Đang tải kho xe…" :
      inBudget + " xe trong ngân sách" + (unknownPrice ? " · " + unknownPrice + " chưa có giá" : "");
    if(loaded){
      // The XTRA budget, dropdown and catalogue chips filter exactly the same public cards.
      document.dispatchEvent(new CustomEvent("ptx:xtra-filters", {
        detail: { category: category.value, eligibleIds: matches.map(car => car.id) }
      }));
    }
    root.replaceChildren();
    if (!loaded) {
      root.append(element("p", "Đang kết nối kho xe công khai…", "xtra-home-empty"));
      return;
    }
    if (!matches.length) {
      root.append(element("p", "Chưa có xe phù hợp bộ lọc này. Bạn có thể thay đổi ngân sách hoặc khám phá toàn bộ bộ sưu tập.", "xtra-home-empty"));
      return;
    }
    matches.slice(0, 3).forEach(car => root.append(vehicleCard(car)));
  };
  // Keep all categories present so an inventory chip can always synchronize.
  Object.entries(labels).forEach(([key, title]) => {
    const option = element("option", title);
    option.value = key;
    category.append(option);
  });
  category.addEventListener("change", display);
  budget.addEventListener("input", display);
  display();

  // Subscribes to the very same API promise as the main catalogue. No second fetch.
  const publicCatalogPromise = globalThis.__ptxPublicCarsPromise;
  if(!publicCatalogPromise || typeof publicCatalogPromise.then!=="function"){
    loaded=true;
    count.textContent="Kho xe tạm thời chưa khả dụng";
    root.replaceChildren(element("p","Chưa kết nối được kho xe công khai. Vui lòng thử tải lại trang.","xtra-home-empty"));
    return;
  }
  publicCatalogPromise
    .then(raw => {
      if (!Array.isArray(raw)) throw new Error("Invalid public cars");
      cars = normalizeCars(raw);
      loaded = true;
      display();
    })
    .catch(() => {
      loaded = true;
      cars = [];
      display();
      count.textContent = "Kho xe tạm thời chưa khả dụng";
      root.replaceChildren(element("p", "Chưa thể tải kho xe. Bạn vẫn có thể mở trải nghiệm xe đầy đủ hoặc liên hệ PHAN THUẦN XTRA để được hỗ trợ.", "xtra-home-empty"));
    });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHomeExperience, { once: true });
  } else {
    initHomeExperience();
  }
}
