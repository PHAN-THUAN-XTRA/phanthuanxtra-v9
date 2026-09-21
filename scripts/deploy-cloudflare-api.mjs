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
    assets: { jwt: assetJwt, config: { html_handling: "none", not_found_handling: "404-page", run_worker_first: ["/", "/style.css", "/admin", "/admin/", "/admin.html", "/admin-control", "/admin-control.html", "/admin-recovery*", "/api/*", "/media/*"] } },
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

async function syncSecretsAndDeploy() {
  const secrets = {};
  const currentBindingNames = new Set((await api(accountPath(`/workers/scripts/${WORKER}/settings`)))?.bindings?.map((binding) => binding?.name).filter(Boolean) || []);
  for (const name of ["ADMIN_PASSWORD", "ADMIN_RECOVERY_ROTATE_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_VIP_BOT_TOKEN"]) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} GitHub secret is absent; refusing production deploy.`);
    secrets[name] = { name, text: value, type: "secret_text" };
  }
  for (const name of ["TELEGRAM_CRM_BOT_TOKEN", "TELEGRAM_CRM_CHAT_ID"]) {
    const value = process.env[name];
    if (value) secrets[name] = { name, text: value, type: "secret_text" };
    else if (currentBindingNames.has(name)) console.log(`${name}: preserving existing Cloudflare Worker binding.`);
    else throw new Error(`${name} is absent from both GitHub Actions and the existing Cloudflare Worker; refusing production deploy.`);
  }
  for (const name of ["TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_VIP_WEBHOOK_SECRET"]) {
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
await applyMigrations();
const assetJwt = await uploadAssets();
await uploadWorker(assetJwt);
await syncSecretsAndDeploy();
await syncCronSchedules();
await verifyApiLineage();
console.log("API/SDK deployment controller completed successfully.");
