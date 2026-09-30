import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { uploadAssetsWithRest, uploadAssetsWithSdk, validateSession } from "./cloudflare-assets-upload.mjs";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const WORKER = "phanthuanxtra-v2";
const DB_ID = "8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d";
const COMPATIBILITY_DATE = "2026-08-11";
const ROOT = process.cwd();
const SRC_DIR = resolve(ROOT, "src");
const PUBLIC_DIR = resolve(ROOT, "public");
const MIGRATIONS_DIR = resolve(ROOT, "migrations");

if (!ACCOUNT_ID || !/^[0-9a-fA-F]{32}$/.test(ACCOUNT_ID)) throw new Error("CLOUDFLARE_ACCOUNT_ID is required and must be a 32-character account ID.");
if (!TOKEN) throw new Error("CLOUDFLARE_API_TOKEN is required.");

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${TOKEN}`, ...extra };
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: authHeaders(options.headers || {}) });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok || body.success === false) {
    const detail = Array.isArray(body.errors) ? body.errors.map((e) => `${e.code ?? "unknown"}: ${e.message ?? "unknown"}`).join("; ") : body.raw || `HTTP ${response.status}`;
    throw new Error(`Cloudflare API ${response.status}: ${detail}`);
  }
  return body.result;
}

function accountPath(path) { return `/accounts/${ACCOUNT_ID}${path}`; }

async function walkFiles(directory) {
  const output = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) output.push(full);
    }
  }
  await visit(directory);
  return output.sort();
}

function assetHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}

async function buildAssetManifest() {
  const files = await walkFiles(PUBLIC_DIR);
  if (!files.length) throw new Error("public/ contains no files; refusing an empty asset deployment.");
  const manifest = {};
  const contentByHash = new Map();
  for (const file of files) {
    const content = await readFile(file);
    const path = `/${relative(PUBLIC_DIR, file).replaceAll("\\", "/")}`;
    const hash = assetHash(content);
    manifest[path] = { hash, size: content.length };
    contentByHash.set(hash, content);
  }
  return { manifest, contentByHash };
}

async function loadCloudflareSdk() {
  try {
    const module = await import("cloudflare");
    return module.default || module.Cloudflare || module;
  } catch (error) {
    throw new Error(`Cloudflare SDK transport selected but package cloudflare is unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function uploadAssets() {
  const { manifest, contentByHash } = await buildAssetManifest();
  const session = await api(accountPath(`/workers/scripts/${WORKER}/assets-upload-session`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manifest }),
  });
  validateSession(session);

  const transport = process.env.CLOUDFLARE_ASSET_TRANSPORT || "sdk";
  if (process.env.CLOUDFLARE_ASSET_SIMULATION === "1") {
    throw new Error("CLOUDFLARE_ASSET_SIMULATION is test-only and cannot be enabled for production deployment.");
  }

  if (transport === "sdk") {
    const Cloudflare = await loadCloudflareSdk();
    console.log(`Assets: using Cloudflare SDK transport; buckets=${session.buckets.length}.`);
    return uploadAssetsWithSdk({ Cloudflare, apiToken: TOKEN, accountId: ACCOUNT_ID, session, contentByHash, log: console.log });
  }

  if (transport === "rest") {
    console.log(`Assets: using direct REST transport; buckets=${session.buckets.length}.`);
    return uploadAssetsWithRest({ apiBase: API_BASE, accountId: ACCOUNT_ID, session, contentByHash, log: console.log });
  }

  throw new Error(`Unsupported CLOUDFLARE_ASSET_TRANSPORT: ${transport}. Use sdk or rest.`);
}

async function queryD1(sql, params = []) {
  return api(accountPath(`/d1/database/${DB_ID}/query`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
}

async function applyMigrations() {
  const files = (await walkFiles(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql"));
  if (!files.length) return;
  try { await queryD1("SELECT name FROM d1_migrations LIMIT 1"); }
  catch {
    await queryD1("CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at INTEGER NOT NULL DEFAULT (unixepoch()))");
  }
  const result = await queryD1("SELECT name FROM d1_migrations ORDER BY id ASC");
  const applied = new Set((result?.[0]?.results || []).map((row) => row.name));
  for (const file of files) {
    const name = relative(MIGRATIONS_DIR, file).replaceAll("\\", "/");
    if (applied.has(name)) continue;
    const sql = await readFile(file, "utf8");
    if (sql.trim()) await queryD1(sql);
    await queryD1("INSERT INTO d1_migrations (name) VALUES (?)", [name]);
    console.log(`D1: applied ${name}`);
  }
}

async function verifyTg527ProductionValues() {
  const result = await queryD1("SELECT id, mileage, price FROM cars WHERE id = ?", ["tg-527"]);
  const row = result?.[0]?.results?.[0];
  if (!row || Number(row.mileage) !== 12000 || Number(row.price) !== 4580000000) {
    throw new Error(`D1 tg-527 verification failed: expected mileage=12000 price=4580000000; got ${JSON.stringify(row ?? null)}`);
  }
  console.log("D1: verified tg-527 mileage=12000 price=4580000000");
}

const TG527_GALLERY = [
  "telegram-531-6fc5b1941350ce0d.webp",
  "telegram-547-b50413a066c0c33b.webp",
  "telegram-527-81f135c7438e3323.webp",
  "telegram-529-22eaa38faf05a011.webp",
  "telegram-530-b9ddcb36eebbaef2.webp",
  "telegram-528-21c37fa510d87d89.webp",
  "telegram-532-f70f1b28356ca061.webp",
  "telegram-533-9edca4739750d4e8.webp",
  "telegram-541-251b338e88753738.webp",
  "telegram-536-605322ae5a4b2325.webp",
  "telegram-535-f245bcfac9efe378.webp",
  "telegram-539-47868b869ef84eb4.webp",
  "telegram-548-cb4795ce7cace48e.webp",
  "telegram-538-951d497b20dd5fda.webp",
  "telegram-549-73b38a68c25ad41e.webp",
  "telegram-537-c91fa0f754b4c14d.webp",
  "telegram-544-58b64d9063922fd9.webp",
  "telegram-543-cbc7619b2aba6891.webp",
  "telegram-542-0e45e420db59f769.webp",
  "telegram-545-736ccdba0225bb8f.webp",
  "telegram-540-eb0d167b6453742d.webp",
  "telegram-546-6fc1f1a6d03f5091.webp",
  "telegram-534-2db16ab4020800c0.webp",
  "telegram-550-be3f863a9ae6a005.webp"
];

async function verifyTg527ProductionGallery() {
  const result = await queryD1("SELECT id,url,sort_order,is_cover FROM car_images WHERE car_id = ? ORDER BY sort_order,id", ["tg-527"]);
  const rows = result?.[0]?.results || [];
  if (rows.length !== 24) throw new Error(`D1 tg-527 gallery verification failed: expected 24 images; got ${rows.length}`);
  const seen = new Set();
  for (let i = 0; i < TG527_GALLERY.length; i++) {
    const row = rows[i];
    const expected = TG527_GALLERY[i];
    const url = String(row?.url || "");
    if (Number(row?.sort_order) !== i) throw new Error(`D1 tg-527 gallery verification failed: index ${i} has sort_order=${row?.sort_order}`);
    if (!url.endsWith("/media/vehicles/" + expected) || url.includes("%2F")) throw new Error(`D1 tg-527 gallery verification failed: index ${i} expected ${expected}; got ${url}`);
    if (seen.has(url)) throw new Error(`D1 tg-527 gallery verification failed: duplicate URL ${url}`);
    seen.add(url);
    if (Number(row?.is_cover) !== (i === 0 ? 1 : 0)) throw new Error(`D1 tg-527 gallery verification failed: index ${i} cover flag=${row?.is_cover}`);
  }
  const car = await queryD1("SELECT cover_image FROM cars WHERE id = ?", ["tg-527"]);
  const cover = String(car?.[0]?.results?.[0]?.cover_image || "");
  if (!cover.endsWith("/media/vehicles/" + TG527_GALLERY[0]) || cover.includes("%2F")) throw new Error(`D1 tg-527 gallery verification failed: cars.cover_image=${cover}`);
  console.log("D1: verified tg-527 gallery 24/24, sort_order=0..23, canonical URLs, single semantic cover");
}

const TG444_GALLERY = [
  "telegram-555-004107aea58e4ebd.webp","telegram-554-23dcb8401e56d467.webp",
  "telegram-556-1bcf83a89a0e4509.webp","telegram-552-e4543cf92c5ce295.webp",
  "telegram-553-811a0623d87fdf2b.webp","telegram-560-561e2f4e19f778cd.webp",
  "telegram-557-e4152ca6d1b544ad.webp","telegram-567-f09a75951cadcb1d.webp",
  "telegram-558-3a8dd58bb844c11c.webp","telegram-559-8f5b60263921aa5e.webp",
  "telegram-562-581bed3ff54367f5.webp","telegram-565-741abb2d25ec9acf.webp",
  "telegram-564-19d7259b250d8e72.webp","telegram-566-17d078c944b9ada4.webp",
  "telegram-568-d2ec80f112be62df.webp","telegram-561-16da962ac4cdccaa.webp",
  "telegram-563-e6b66162e499bd47.webp"
];
async function verifyTg444ProductionGallery() {
  const result=await queryD1("SELECT i.url,i.sort_order,i.is_cover,c.cover_image FROM car_images i JOIN cars c ON c.id=i.car_id WHERE i.car_id='tg-444' ORDER BY i.sort_order,i.id");
  const rows=result?.[0]?.results||[];
  const names=rows.map(row=>String(row.url||"").split("/").pop());
  if(rows.length!==17 || names.join("|")!==TG444_GALLERY.join("|") ||
     rows.some((row,index)=>Number(row.sort_order)!==index) ||
     rows.filter(row=>Number(row.is_cover)===1).length!==1 ||
     Number(rows[0]?.is_cover)!==1 ||
     rows[0]?.url!==rows[0]?.cover_image ||
     rows.some(row=>String(row.url||"").includes("telegram-444-3b7aec5feb857597.webp"))) {
    throw new Error(`D1 tg-444 gallery verification failed: expected 17 semantic LX570 images with foreign image removed; got ${JSON.stringify(rows)}`);
  }
  console.log("D1: verified tg-444 gallery 17/17, unrelated white-vehicle image removed, semantic sort_order=0..16, single exterior cover");
}

async function verifyLx570Recovery() {
  const bundles = await queryD1("SELECT bundle_key, COUNT(*) row_count, SUM(CASE WHEN file_id <> '' THEN 1 ELSE 0 END) photo_count, SUM(CASE WHEN file_id = '' THEN 1 ELSE 0 END) text_count, MIN(bundle_status) min_bundle_status, MAX(bundle_status) max_bundle_status FROM telegram_inbox WHERE bundle_key LIKE 'recover:lx570:%' GROUP BY bundle_key ORDER BY MAX(id) DESC LIMIT 1");
  const bundle = bundles?.[0]?.results?.[0];
  if (!bundle || Number(bundle.photo_count) !== 18 || Number(bundle.text_count) !== 1 || Number(bundle.row_count) !== 19) {
    throw new Error(`D1 LX570 recovery verification failed: expected 18 photos + 1 text row; got ${JSON.stringify(bundle ?? null)}`);
  }
  const draftResult = await queryD1("SELECT d.inbox_id,d.status,d.ai_json FROM vehicle_ai_drafts d JOIN telegram_inbox i ON i.id=d.inbox_id WHERE i.bundle_key=? ORDER BY d.id DESC LIMIT 1", [bundle.bundle_key]);
  const draft = draftResult?.[0]?.results?.[0];
  let ai = {};
  try { ai = JSON.parse(draft?.ai_json || "{}"); } catch {}
  const keys = Array.isArray(ai.publish_media_keys) ? ai.publish_media_keys.filter(Boolean) : [];
  if (!draft || Number(draft.inbox_id) !== 444 || !["awaiting_review","previewed","published"].includes(String(draft.status)) || Number(ai.image_count) !== 18 || keys.length !== 18) {
    throw new Error(`D1 LX570 draft verification failed: expected inbox=444 reviewable 18-image draft; got status=${draft?.status ?? null} image_count=${ai.image_count ?? null} keys=${keys.length}`);
  }
  if (Number(ai.mileage) !== 54800 || Number(ai.price) !== 4579000000 || Number(ai._owner_values_locked) !== 1) {
    throw new Error(`D1 LX570 owner-value verification failed: expected inbox=444 mileage=54800 price=4579000000 owner lock; got mileage=${ai.mileage ?? null} price=${ai.price ?? null} lock=${ai._owner_values_locked ?? null}`);
  }
  console.log(`D1: verified LX570 recovery 18/18 photos + 1 text; draft inbox=${draft.inbox_id} status=${draft.status} image_count=18 mileage=54800 price=4579000000 owner_values=locked`);
  return { inboxId: Number(draft.inbox_id), status: String(draft.status) };
}

async function getCurrentBindings() {
  const settings = await api(accountPath(`/workers/scripts/${WORKER}/settings`));
  const bindings = settings?.bindings || [];
  const inherited = bindings.filter((binding) => binding?.name).map((binding) => ({ name: binding.name, type: "inherit", version_id: "latest" }));
  if (!inherited.some((binding) => binding.name === "ASSETS")) inherited.push({ name: "ASSETS", type: "assets" });
  return inherited;
}

function moduleContentType(file) {
  const extension = extname(file).toLowerCase();
  if (extension === ".js" || extension === ".mjs") return "application/javascript+module";
  if (extension === ".json") return "application/json";
  if (extension === ".wasm") return "application/wasm";
  return "text/plain";
}

async function uploadWorker(assetJwt) {
  const files = await walkFiles(SRC_DIR);
  if (!files.some((file) => file === join(SRC_DIR, "entry.js"))) throw new Error("src/entry.js is missing; refusing deployment.");
  const metadata = {
    main_module: "src/entry.js",
    compatibility_date: COMPATIBILITY_DATE,
    compatibility_flags: ["nodejs_compat"],
    assets: { jwt: assetJwt, config: { not_found_handling: "404-page", run_worker_first: true } },
    triggers: { crons: ["*/5 * * * *"] },
    bindings: await getCurrentBindings(),
    annotations: {
      "workers/message": `API deploy ${process.env.GITHUB_SHA || "local"}`,
      "workers/tag": process.env.GITHUB_SHA || "api-deploy",
    },
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  for (const file of files) {
    const part = relative(ROOT, file).replaceAll("\\", "/");
    form.append(part, new Blob([await readFile(file)], { type: moduleContentType(file) }), part);
  }
  const response = await fetch(`${API_BASE}${accountPath(`/workers/scripts/${WORKER}`)}`, { method: "PUT", headers: authHeaders(), body: form });
  const body = await response.json();
  if (!response.ok || body.success === false) throw new Error(`Worker API upload failed: ${Array.isArray(body.errors) ? body.errors.map((e) => `${e.code ?? "unknown"}: ${e.message ?? "unknown"}`).join("; ") : `HTTP ${response.status}`}`);
  console.log(`Worker: API upload completed for ${files.length} modules.`);
}

async function ensureCustomDomainRoute() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID || "7b2653821ef0d8052bfc91c4cf5008ca";
  const routes = await api(`/zones/${zoneId}/workers/routes`);
  console.log("Zone Worker routes:", JSON.stringify((Array.isArray(routes) ? routes : []).filter(r => String(r?.pattern||"").includes("phanthuanxtra.com")).map(r => ({pattern:r.pattern,script:r.script||null}))));
  try {
    const domains = await api(accountPath("/workers/domains"));
    console.log("Worker custom-domain owners:", JSON.stringify((Array.isArray(domains) ? domains : []).filter(d => d?.hostname === "phanthuanxtra.com").map(d => ({hostname:d.hostname,service:d.service,environment:d.environment}))));
  } catch (error) { console.log("Worker custom-domain inventory unavailable:", String(error?.message||error).slice(0,120)); }
  const wanted = "phanthuanxtra.com/*";
  const current = Array.isArray(routes) ? routes.find((route) => route?.pattern === wanted) : null;

  // Explicit homepage and Blog routes outrank legacy Workers and broader routes.
  // The Worker origin can serve Blog while the zone otherwise returns a plain
  // text 404 for these paths. Preserve all unrelated route ownership.
  for (const pattern of ["phanthuanxtra.com/", "phanthuanxtra.com/home", "phanthuanxtra.com/home/", "phanthuanxtra.com/api/blog*", "phanthuanxtra.com/blog*", "phanthuanxtra.com/api/blog/*", "phanthuanxtra.com/blog", "phanthuanxtra.com/blog/*"]) {
    const route = Array.isArray(routes) ? routes.find(item => item?.pattern === pattern) : null;
    if (route?.script === WORKER) continue;
    const method = route?.id ? "PUT" : "POST";
    const endpoint = route?.id ? `/zones/${zoneId}/workers/routes/${route.id}` : `/zones/${zoneId}/workers/routes`;
    await api(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pattern, script: WORKER }) });
    console.log(`Route: ${method === "PUT" ? "updated" : "created"} ${pattern} -> ${WORKER}.`);
  }

  if (current?.script === WORKER) {
    console.log(`Route: ${wanted} -> ${WORKER} already configured.`);
    return;
  }
  if (current?.id) {
    await api(`/zones/${zoneId}/workers/routes/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern: wanted, script: WORKER }),
    });
    console.log(`Route: updated ${wanted} -> ${WORKER}.`);
    return;
  }
  await api(`/zones/${zoneId}/workers/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pattern: wanted, script: WORKER }),
  });
  console.log(`Route: created ${wanted} -> ${WORKER}.`);
}

async function syncSecretsAndDeploy() {
  const secrets = {};
  const currentBindingNames = new Set((await api(accountPath(`/workers/scripts/${WORKER}/settings`)))?.bindings?.map((binding) => binding?.name).filter(Boolean) || []);
  for (const name of ["ADMIN_PASSWORD", "ADMIN_RECOVERY_ROTATE_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_VIP_BOT_TOKEN"]) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} GitHub secret is absent; refusing production deploy.`);
    secrets[name] = { name, text: value, type: "secret_text" };
  }
  for (const name of ["TELEGRAM_AUTO_BOT_TOKEN", "TELEGRAM_CRM_BOT_TOKEN", "TELEGRAM_CRM_CHAT_ID"]) {
    const value = process.env[name];
    if (value) secrets[name] = { name, text: value, type: "secret_text" };
    else if (currentBindingNames.has(name)) console.log(`${name}: preserving existing Cloudflare Worker binding.`);
    else throw new Error(`${name} is absent from both GitHub Actions and the existing Cloudflare Worker; refusing production deploy.`);
  }
  for (const name of ["TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_VIP_WEBHOOK_SECRET", "TELEGRAM_AUTO_PUBLISH_CHAT_IDS", "GEMINI_API_KEY", "GEMINI_MODEL", "PUBLISH_API_KEY"]) {
    const value = process.env[name];
    if (value) secrets[name] = { name, text: value, type: "secret_text" };
  }
  await api(accountPath(`/workers/scripts/${WORKER}/secrets-bulk`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secrets, version_tags: { "workers/tag": process.env.GITHUB_SHA || "api-secret-sync" } }),
  });
  const versions = await api(accountPath(`/workers/scripts/${WORKER}/versions?deployable=true&per_page=1`));
  const latest = versions?.items?.[0]?.id;
  if (!latest) throw new Error("No deployable Worker version returned after secret synchronization.");
  const deployment = await api(accountPath(`/workers/scripts/${WORKER}/deployments`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategy: "percentage", versions: [{ percentage: 100, version_id: latest }], annotations: { "workers/message": `API production deployment ${process.env.GITHUB_SHA || "unknown"}` } }),
  });
  console.log(`Deployment: 100% traffic assigned to API-created version ${latest}.`);
  return deployment;
}

async function syncCronSchedules() {
  const result = await api(accountPath(`/workers/scripts/${WORKER}/schedules`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ cron: "*/5 * * * *" }]),
  });
  const schedules = result?.schedules || [];
  if (!schedules.some((schedule) => schedule?.cron === "*/5 * * * *")) {
    throw new Error("Cloudflare Cron Trigger verification failed: */5 * * * * is not configured.");
  }
  console.log("Cloudflare Cron Trigger: */5 * * * * configured and verified.");
}

async function verifyApiLineage() {
  const deployments = await api(accountPath(`/workers/scripts/${WORKER}/deployments`));
  const latest = deployments?.deployments?.[0];
  const versionId = latest?.versions?.[0]?.version_id;
  if (!versionId) throw new Error("Latest Cloudflare deployment has no version ID.");
  const version = await api(accountPath(`/workers/scripts/${WORKER}/versions/${versionId}`));
  const source = version?.resources?.script?.last_deployed_from;
  if (source && source !== "api") throw new Error(`Unexpected Worker deployment source: ${source}`);
  console.log(`Cloudflare lineage: deployment=${latest.id}, version=${versionId}, source=${source || "api"}.`);
}

console.log("=== PHAN THUẦN XTRA — Cloudflare API/SDK production controller ===");
console.log("Wrangler is intentionally not invoked by this controller.");
// Check new publishing dependencies before changing migrations, assets or runtime.
const publishingBindings = (await api(accountPath(`/workers/scripts/${WORKER}/settings`)))?.bindings || [];
for (const name of ["IMAGES", "MEDIA", "GEMINI_API_KEY", "GEMINI_MODEL", "PUBLISH_API_KEY"]) {
  if (!publishingBindings.some(binding => binding.name === name) && !process.env[name])
    throw new Error(`${name} is required on the website Worker for editorial publishing; configure it before deployment.`);
}
await applyMigrations();
await verifyTg527ProductionValues();
await verifyTg527ProductionGallery();
await verifyLx570Recovery();
await verifyTg444ProductionGallery();
const assetJwt = await uploadAssets();
await uploadWorker(assetJwt);
await syncSecretsAndDeploy();
await ensureCustomDomainRoute();
// A deploy is incomplete if the custom domain is still shadowed by an edge route.
const blogCheck = await fetch("https://phanthuanxtra.com/api/blog/posts?deploy-check=" + encodeURIComponent(process.env.GITHUB_SHA || Date.now()), { headers: { accept: "application/json" } });
const blogType = blogCheck.headers.get("content-type") || "";
if (blogCheck.status !== 200 || !blogType.includes("application/json")) throw new Error(`Blog custom-domain route failed: HTTP ${blogCheck.status}, content-type ${blogType}`);
console.log("Blog custom-domain API route: HTTP 200 JSON.");
await syncCronSchedules();
await verifyApiLineage();
console.log("API/SDK deployment controller completed successfully.");
