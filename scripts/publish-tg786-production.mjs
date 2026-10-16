// One-time, owner-authorized, fail-closed production recovery for Telegram Inbox 786.
// Do not use for other vehicles or expose Cloudflare/Admin credentials.
const SITE = "https://phanthuanxtra.com";
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const DB = "8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d";
const CAR_ID = "tg-786";
const INBOX = 786;
const OUT = (...args) => console.log("[tg-786]", ...args);
function assert(value, reason) { if (!value) throw Error(reason); }
export function recoverOwnerVehicle(draft) {
  assert(Number(draft?.inbox_id) === INBOX, "Wrong inbox");
  assert(["awaiting_review", "previewed", "published"].includes(draft.status), "Draft status not publishable: " + draft.status);
  const source = String(draft.source_caption || "").trim();
  assert(/HUMMER\s+H2\s+LUXURY\s+2009/i.test(source), "Draft identity does not match approved Hummer H2 Luxury 2009");
  const ai = JSON.parse(draft.ai_json || "{}");
  const keys = ai.publish_media_keys;
  assert(Array.isArray(keys) && keys.length === 24 && new Set(keys).size === 24, "Not exactly 24 distinct WebP media keys");
  assert(keys.every(k => typeof k === "string" && /^(?:vehicles|telegram)\/[a-zA-Z0-9_./-]+\.webp$/.test(k) && !k.includes("..")), "Invalid R2 key");
  const match = /(?:^|\n)\s*(?:💰\s*)?Giá\s*[:：=-]?\s*(\d+(?:[.,]\d+)?)\s*(?:tỷ|tỉ)(?=\s|$|[.!])/iu.exec(source);
  assert(match, "Owner price not found");
  const price = Math.round(Number(match[1].replace(",", ".")) * 1_000_000_000);
  assert(price === 2600000000, "Unexpected owner price; refusing publish");
  const media = keys.map(k => SITE + "/media/" + k.split("/").map(encodeURIComponent).join("/"));
  return { id: CAR_ID, brand: "HUMMER", model: "H2 Luxury", year: 2009,
    mileage: null, price, category: "suv", status: "available", featured: false,
    description: source, cover_image: media[0], images: media };
}
async function requestJson(url, init={}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}
function checkVehicle(car, expected) {
  assert(car && car.id === CAR_ID, "Wrong vehicle after publish");
  assert(String(car.brand).toUpperCase() === "HUMMER" && /^H2\s+Luxury$/i.test(car.model), "Wrong brand/model");
  assert(Number(car.year) === 2009 && Number(car.price) === 2600000000, "Price/year mismatch");
  assert(car.status === "available", "Car hidden or unavailable");
  assert(Array.isArray(car.images) && car.images.length === 24, "Gallery is incomplete");
  const urls = car.images.map(item => typeof item === "string" ? item : item.url);
  assert(new Set(urls).size === 24 && urls.every((u,i) => u === expected.images[i]), "Gallery mismatch/order");
  assert(car.cover_image === expected.cover_image, "Cover mismatch");
}
async function main() {
  assert(process.env.GITHUB_REF === "refs/heads/main", "Production only on main");
  assert(/^[0-9a-fA-F]{32}$/.test(ACCOUNT), "Cloudflare account ID invalid");
  assert(process.env.ADMIN_PASSWORD, "Admin password unavailable");
  const tokens = [process.env.CLOUDFLARE_API_TOKEN, process.env.CLOUDFLARE_BACKUP_API_TOKEN].filter(Boolean);
  assert(tokens.length, "Cloudflare token unavailable");
  const endpoint = "https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT + "/d1/database/" + DB + "/query";
  async function d1(sql, params=[]) {
    let errors = [];
    for (const token of tokens) {
      try {
        const response = await requestJson(endpoint, { method:"POST",
          headers: { authorization: "Bearer " + token, "content-type":"application/json" },
          body: JSON.stringify({sql,params}) });
        if (response.status === 200 && response.body.success === true)
          return response.body.result?.[0]?.results || [];
        errors.push("HTTP " + response.status + ": " + JSON.stringify(response.body.errors || []).slice(0,180));
      } catch (error) { errors.push(String(error.message || error)); }
    }
    throw Error("Cloudflare D1 query failed: " + errors.join("; "));
  }
  const rows = await d1("SELECT d.inbox_id,d.status,d.ai_json,d.source_caption FROM vehicle_ai_drafts d WHERE d.inbox_id=? LIMIT 1",[INBOX]);
  assert(rows.length === 1, "Telegram draft 786 missing from D1");
  const expected = recoverOwnerVehicle(rows[0]);
  OUT("D1 draft:", rows[0].status, "24 existing R2 WebP", "price 2600000000");
  const login = await requestJson(SITE + "/api/admin/login", {method:"POST",
    headers:{"content-type":"application/json"},body:JSON.stringify({password:process.env.ADMIN_PASSWORD})});
  assert(login.status === 200 && login.body.ok === true && login.body.token, "Admin login failed: HTTP " + login.status);
  const headers = {authorization:"Bearer " + login.body.token};
  const detailUrl = SITE + "/api/admin/cars/" + CAR_ID;
  let detail = await requestJson(detailUrl, {headers});
  if (detail.status === 404) {
    OUT("Creating canonical vehicle tg-786 from owner-approved existing draft");
    const created = await requestJson(SITE + "/api/admin/cars", {method:"POST",
      headers:{...headers,"content-type":"application/json;charset=utf-8"},body:JSON.stringify(expected)});
    assert([200,201,409].includes(created.status), "Admin publish error HTTP " + created.status + ": " + JSON.stringify(created.body).slice(0,300));
    detail = await requestJson(detailUrl,{headers});
  } else {
    OUT("Canonical vehicle exists; verifying instead of creating duplicate");
  }
  assert(detail.status === 200, "Admin detail unreadable: " + detail.status);
  checkVehicle(detail.body.car, expected);
  OUT("Admin vehicle verified: 24 distinct images, cover, Hummer identity, price, available");
  await d1("UPDATE vehicle_ai_drafts SET status='published',car_id=?,error=NULL,updated_at=CURRENT_TIMESTAMP WHERE inbox_id=? AND status IN ('awaiting_review','previewed','published')",[CAR_ID,INBOX]);
  await d1("UPDATE telegram_inbox SET status='published',bundle_status='published',car_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[CAR_ID,INBOX]);
  const publicApi = await requestJson(SITE + "/api/cars?_publish_check=" + Date.now());
  assert(publicApi.status === 200, "Public car API not reachable: " + publicApi.status);
  const publicCars = Array.isArray(publicApi.body) ? publicApi.body : (publicApi.body.cars || publicApi.body.data || []);
  assert(Array.isArray(publicCars) && publicCars.some(c => c.id === CAR_ID && c.status !== "hidden"), "Car not listed in public API");
  const page = await fetch(SITE + "/car?id=" + CAR_ID + "&verify=" + Date.now(), {signal:AbortSignal.timeout(20000)});
  assert(page.status === 200, "Car URL does not respond HTTP 200: " + page.status);
  OUT("PUBLISHED_AND_VERIFIED", SITE + "/car?id=" + CAR_ID);
}
if (process.env.NODE_ENV !== "test") {
  main().catch(error => { console.error("[tg-786] FAILED:", error.message || error); process.exitCode = 1; });
}
