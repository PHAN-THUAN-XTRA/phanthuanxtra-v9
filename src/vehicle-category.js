export const VEHICLE_CATEGORIES = Object.freeze(["suv","sedan","coupe","convertible","mpv","pickup","wagon","sport","other"]);

const clean = value => String(value ?? "").trim().toLowerCase();
const fold = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"");

const ALIASES = Object.freeze({
  suv:"suv", crossover:"suv", cuv:"suv", "sport utility vehicle":"suv",
  sedan:"sedan", saloon:"sedan",
  coupe:"coupe", "coupé":"coupe",
  convertible:"convertible", cabriolet:"convertible", cabrio:"convertible", roadster:"convertible", spider:"convertible", spyder:"convertible",
  mpv:"mpv", minivan:"mpv", van:"mpv",
  pickup:"pickup", "pick-up":"pickup", truck:"pickup",
  wagon:"wagon", estate:"wagon", avant:"wagon", touring:"wagon", shootingbrake:"wagon", "shooting brake":"wagon",
  sport:"sport", "sports car":"sport", supercar:"sport", hypercar:"sport",
  other:"other"
});

export function canonicalVehicleCategory(value){
  const key=fold(value).replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
  return ALIASES[key] || null;
}

export function inferVehicleCategory(vehicle={}){
  const explicit=canonicalVehicleCategory(vehicle.category);
  if(explicit && explicit!=="other") return explicit;
  const hay=fold([vehicle.brand,vehicle.model,vehicle.description,vehicle.caption].filter(Boolean).join(" "));
  if(!hay) return explicit || "other";

  // Body-style words supplied by the owner or extracted from the listing take priority.
  if(/\b(crossover|cuv|suv|sport utility)\b/.test(hay)) return "suv";
  if(/\b(cabriolet|convertible|roadster|spider|spyder)\b/.test(hay)) return "convertible";
  if(/\b(mpv|minivan)\b/.test(hay)) return "mpv";
  if(/\b(pick[ -]?up)\b/.test(hay)) return "pickup";
  if(/\b(wagon|estate|avant|touring|shooting brake)\b/.test(hay)) return "wagon";
  if(/\b(coupe|coupe)\b/.test(hay)) return "coupe";
  if(/\b(sedan|saloon)\b/.test(hay)) return "sedan";
  if(/\b(supercar|hypercar|sports car)\b/.test(hay)) return "sport";

  // Stable model-family fallback for common premium inventory when captions omit body style.
  if(/\b(rx\s*\d|gx\s*\d|lx\s*\d|q[2-9]\b|defender\b|land cruiser\b|cayenne\b|macan\b|urus\b|bentayga\b|range rover\b|gle\b|gls\b|glc\b|x[1-7]\b|xc(?:40|60|90)\b)/.test(hay)) return "suv";
  if(/\b(ls\s*\d|es\s*\d|s[- ]?class\b|e[- ]?class\b|c[- ]?class\b|a[468]\b|7 series\b|5 series\b|3 series\b|panamera\b)/.test(hay)) return "sedan";
  if(/\b(lexus lm|alphard|vellfire|v[- ]?class)\b/.test(hay)) return "mpv";
  if(/\b(ranger|hilux|navara|triton|ram 1500|f[- ]?150)\b/.test(hay)) return "pickup";
  if(/\b(rs6 avant|e[- ]?class estate|panamera sport turismo)\b/.test(hay)) return "wagon";
  if(/\b(911|amg gt|ferrari|lamborghini|mclaren)\b/.test(hay)) return "sport";
  return explicit || "other";
}

export function vehicleCategoryLabel(value){
  return ({suv:"SUV / Crossover",sedan:"Sedan",coupe:"Coupe",convertible:"Convertible",mpv:"MPV / Minivan",pickup:"Pickup",wagon:"Wagon",sport:"Thể thao",other:"Khác"})[canonicalVehicleCategory(value)||"other"];
}
