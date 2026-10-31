// XTRA Intelligent UI: public, read-only showroom advisor; no AI, secrets or mutation endpoints.
const ALLOWED_CATEGORIES = ["all", "suv", "sedan", "coupe", "convertible", "mpv", "pickup", "wagon", "sport", "other"];
const CATEGORY_LABELS = {all:"Tất cả dòng xe",suv:"SUV / Crossover",sedan:"Sedan",coupe:"Coupe",convertible:"Convertible",mpv:"MPV",pickup:"Pickup",wagon:"Wagon",sport:"Thể thao",other:"Khác"};
const MONEY = new Intl.NumberFormat("vi-VN");
const MAX_CARS = 8;
export const MAX_VEHICLE_BUDGET = 200_000_000_000;

// Nonlinear slider: fine-grained below 30 billion, wider steps for rare hypercars.
// Benchmark is an observed ~200-billion-VND on-road vehicle, not a current listing.
export function budgetFromPosition(position) {
  const p = Number(position);
  if (!Number.isFinite(p)) return 20_000_000_000;
  const n = Math.max(0, Math.min(100, p));
  const billion = n <= 60 ? 0.5 + n * (29.5 / 60)
    : n <= 85 ? 30 + (n - 60) * (70 / 25)
    : 100 + (n - 85) * (100 / 15);
  return Math.min(MAX_VEHICLE_BUDGET, Math.max(500_000_000, Math.round(billion * 2) * 500_000_000));
}

export function parsePrice(value) {
  if (typeof value === "number") return Number.isFinite(value) && value >= 1000000 ? Math.round(value) : null;
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (!/^[0-9][0-9.,\s]*(?:đ|vnđ)?$/u.test(s)) return null;
  const n = Number(s.replace(/[^0-9]/g, ""));
  return Number.isSafeInteger(n) && n >= 1000000 ? n : null;
}

export function normalizeCars(payload) {
  if (!Array.isArray(payload)) return [];
  const ids = new Set();
  return payload.filter(car => {
    if (!car || typeof car !== "object") return false;
    const id = String(car.id || "");
    const status = String(car.status || car.tag || "").toLowerCase().trim();
    if (!/^[a-z0-9_-]{2,80}$/i.test(id) || ids.has(id) || status !== "available") return false;
    ids.add(id);
    return true;
  }).map(car => {
    const category = String(car.category || "other").toLowerCase();
    return {
      id:String(car.id), brand:String(car.brand || "").slice(0,100),
      name: id === "tg-811" ? "PHANTOM VII 2009 | STANDARD WHEELBASE | V12 6.75L | SEDAN SIÊU SANG" : String(car.name || car.model || "").slice(0,160),
      year:String(car.year || "").slice(0,4),
      // Owner-provided registration/inspection evidence identifies tg-811 as Phantom VII Sedan SWB.
      category: id === "tg-811" && /^rolls[- ]?royce$/i.test(String(car.brand || "")) ? "sedan" : (ALLOWED_CATEGORIES.includes(category) ? category : "other"),
      price:parsePrice(car.price), priceLabel:String(car.price || "Liên hệ").slice(0,60),
      image:String(car.cover_image || car.image || "").slice(0,1200),
      odo:String(car.odo || car.mileage || "Liên hệ").slice(0,60)
    };
  });
}

export function filterCars(cars, filters = {}) {
  const query = String(filters.query || "").trim().toLocaleLowerCase("vi");
  const category = ALLOWED_CATEGORIES.includes(filters.category) ? filters.category : "all";
  const budget = Number.isFinite(filters.budget) ? Math.max(500_000_000, Math.min(MAX_VEHICLE_BUDGET, filters.budget)) : MAX_VEHICLE_BUDGET;
  const includeUnpriced = filters.includeUnpriced !== false;
  return cars.filter(car => {
    if (category !== "all" && car.category !== category) return false;
    if (query && !(car.brand + " " + car.name + " " + car.year).toLocaleLowerCase("vi").includes(query)) return false;
    return car.price === null ? includeUnpriced : car.price <= budget;
  }).sort((a,b) => (a.price === null) - (b.price === null) || (b.year.localeCompare(a.year)) || a.name.localeCompare(b.name,"vi"));
}

export function monthlyPayment(price, downPercent, months, annualRate = 9) {
  if (![price,downPercent,months,annualRate].every(Number.isFinite) ||
    price < 0 || downPercent < 0 || downPercent > 100 ||
    !Number.isInteger(months) || months < 1 || months > 360 || annualRate < 0) return null;
  const principal = price * (1 - downPercent/100);
  const r = annualRate/1200;
  const payment = r === 0 ? principal/months : principal*r/(1-Math.pow(1+r,-months));
  return {down:price*downPercent/100, principal, payment};
}

export function safeImage(raw) {
  try {
    const u = new URL(raw, "https://phanthuanxtra.com");
    return u.origin === "https://phanthuanxtra.com" &&
      (u.pathname.startsWith("/media/") || u.pathname.startsWith("/images/")) ? u.href : "";
  } catch { return ""; }
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function formatMoney(value) { return MONEY.format(Math.round(value)) + " đ"; }
function formatBudget(value) { return MONEY.format(value/1000000000) + " tỷ đồng"; }
function byId(id) { return document.getElementById(id); }

export function initShowroom() {
  const root = byId("xtra-results");
  if (!root) return;
  const state = {cars:[],category:"all",query:"",budget:20000000000,includeUnpriced:true,selected:null,down:50,months:36};
  const categories = byId("xtra-category");
  ALLOWED_CATEGORIES.forEach(key => {
    const opt = el("option", CATEGORY_LABELS[key]);
    opt.value = key;
    categories.append(opt);
  });
  const budget = byId("xtra-budget"), down = byId("xtra-down"), term = byId("xtra-term");
  const count = byId("xtra-count"), price = byId("xtra-price"), finance = byId("xtra-finance");
  const budgetLabel = byId("xtra-budget-label"), downLabel = byId("xtra-down-label");
  const note = byId("xtra-note");
  const choose = id => {state.selected=id;render();};
  function financeView(car) {
    finance.replaceChildren();
    if (!car || car.price === null) {
      price.textContent = "Giá chưa công bố";
      finance.append(el("p","Chưa thể tính tài chính vì xe chưa công bố giá. Vui lòng đặt lịch để nhận báo giá chính xác.","notice"));
      return;
    }
    price.textContent = formatMoney(car.price);
    const estimate = monthlyPayment(car.price,state.down,state.months);
    if (!estimate) return;
    finance.append(el("p",car.brand + " " + car.name,"finance-car"));
    const amount = el("strong",formatMoney(estimate.payment),"finance-monthly");
    finance.append(amount,el("span","Khoản thanh toán mỗi tháng (ước tính)","finance-caption"));
    const bar = el("div",null,"finance-bar");
    bar.setAttribute("role","img");
    bar.setAttribute("aria-label","Vốn tự có " + state.down + "%, phần vay " + (100-state.down) + "%");
    const own = el("span");own.style.width=state.down+"%";bar.append(own);finance.append(bar);
    const breakdown = el("div",null,"finance-breakdown");
    const ownBox = el("div");ownBox.append(el("small","Vốn ban đầu"),el("b",formatMoney(estimate.down)));
    const loanBox = el("div");loanBox.append(el("small","Khoản vay"),el("b",formatMoney(estimate.principal)));
    breakdown.append(ownBox,loanBox);finance.append(breakdown);
  }
  function carCard(car) {
    const card = el("article",null,"xtra-car");
    const media = el("div",null,"xtra-car-media");
    const src = safeImage(car.image);
    if (src) {
      const img = el("img");
      img.src = src;img.alt = car.brand + " " + car.name;img.loading="lazy";img.decoding="async";
      img.addEventListener("error",()=>{img.remove();media.append(el("span","PHAN THUẦN XTRA","image-fallback"));},{once:true});
      media.append(img);
    } else media.append(el("span","PHAN THUẦN XTRA","image-fallback"));
    card.append(media);
    const body = el("div",null,"xtra-car-body");
    body.append(el("p",car.brand + " · " + (CATEGORY_LABELS[car.category] || "Ô tô"),"car-meta"));
    body.append(el("h3",car.name || "Xe tuyển chọn"));
    body.append(el("p",[car.year,car.odo].filter(Boolean).join(" · "),"car-odo"));
    body.append(el("strong",car.price === null ? "Giá: Liên hệ" : formatMoney(car.price),"car-price"));
    if (car.price === null) body.append(el("p","Chưa xác định phù hợp ngân sách","car-warning"));
    const actions=el("div",null,"car-actions");
    const select=el("button",state.selected===car.id?"Đang tính tài chính":"Tính tài chính","btn-calc");
    select.type="button";select.setAttribute("aria-pressed",String(state.selected===car.id));select.addEventListener("click",()=>choose(car.id));
    const link=el("a","Xem xe ↗","btn-detail");link.href="/car.html?id="+encodeURIComponent(car.id);
    actions.append(select,link);body.append(actions);card.append(body);
    if(state.selected===car.id)card.classList.add("selected");
    return card;
  }
  function render() {
    budgetLabel.textContent = formatBudget(state.budget);
    budget.setAttribute("aria-valuetext", formatBudget(state.budget));
    downLabel.textContent = state.down + "%";
    const matches = filterCars(state.cars,state);
    if (!matches.some(car=>car.id===state.selected)) state.selected=matches[0]?.id || null;
    const priced = matches.filter(car=>car.price!==null).length;
    const unpriced = matches.length - priced;
    count.textContent = priced + " xe trong ngân sách" + (unpriced ? " · " + unpriced + " xe chưa công bố giá (tham khảo)" : "");
    root.replaceChildren();
    if(!matches.length){
      root.append(el("p","Không tìm thấy xe phù hợp. Hãy điều chỉnh ngân sách hoặc dòng xe.","empty-state"));
    }else{
      matches.slice(0,MAX_CARS).forEach(car=>root.append(carCard(car)));
      if(matches.length>MAX_CARS)root.append(el("p","Hiển thị "+MAX_CARS+" trong "+matches.length+" xe. Thu hẹp bộ lọc để xem thêm.","results-overflow"));
    }
    financeView(matches.find(car=>car.id===state.selected));
    down.disabled = term.disabled = !state.selected || matches.find(car=>car.id===state.selected)?.price === null;
    byId("xtra-book").href="/#test-drive";
  }
  byId("xtra-search").addEventListener("input",e=>{state.query=e.target.value.slice(0,80);render();});
  categories.addEventListener("change",e=>{state.category=e.target.value;render();});
  budget.addEventListener("input",e=>{state.budget=budgetFromPosition(e.target.value);render();});
  byId("xtra-unpriced").addEventListener("change",e=>{state.includeUnpriced=e.target.checked;render();});
  down.addEventListener("input",e=>{state.down=Number(e.target.value);render();});
  term.addEventListener("change",e=>{state.months=Number(e.target.value);render();});
  count.textContent = "Đang tải kho xe công khai…";
  fetch("/api/cars",{cache:"no-store",credentials:"same-origin"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).then(data=>{
    if(!data || !Array.isArray(data.cars))throw Error("Invalid catalogue");
    state.cars=normalizeCars(data.cars);
    note.textContent="Đang hiển thị dữ liệu xe công khai mới nhất từ PHAN THUẦN XTRA.";
    render();
  }).catch(()=>{
    state.cars=[];
    render();
    count.textContent="Chưa tải được kho xe";
    note.textContent="Không thể tải dữ liệu xe lúc này. Vui lòng thử lại sau hoặc xem kho xe chính.";
  });
}
if (typeof document !== "undefined") {
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initShowroom,{once:true});
  else initShowroom();
}
