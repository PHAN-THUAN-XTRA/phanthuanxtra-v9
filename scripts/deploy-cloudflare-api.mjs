import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

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

if (!ACCOUNT_ID || !/^[0-9a-fA-F]{32}$/.test(ACCOUNT_ID)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID is required and must be a 32-character account ID.");
}
if (!TOKEN) throw new Error("CLOUDFLARE_API_TOKEN is required.");

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${TOKEN}`, ...extra };
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok || body.success === false) {
    const detail = Array.isArray(body.errors)
      ? body.errors.map((e) => `${e.code ?? "unknown"}: ${e.message ?? "unknown"}`).join("; ")
      : body.raw || `HTTP ${response.status}`;
    throw new Error(`Cloudflare API ${response.status}: ${detail}`);
  }
  return body.result;
}

function apiUrl(path) {
  return `/accounts/${ACCOUNT_ID}${path}`;
}

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

function assetHash(content, extension) {
  return createHash("sha256")
    .update(content.toString("base64") + extension)
    .digest("hex")
    .slice(0, 32);
}

async function buildAssetManifest() {
  const files = await walkFiles(PUBLIC_DIR);
  if (!files.length) throw new Error("public/ contains no files; refusing an empty asset deployment.");
  const manifest = {};
  const contentByHash = new Map();
  for (const file of files) {
    const content = await readFile(file);
    const relativePath = relative(PUBLIC_DIR, file).replaceAll("\\", "/");
    const hash = assetHash(content, extname(relativePath).slice(1));
    manifest[`/${relativePath}`] = { hash, size: content.length };
    contentByHash.set(hash, content);
  }
  return { manifest, contentByHash };
}

async function uploadAssets() {
  const { manifest, contentByHash } = await buildAssetManifest();
  const session = await api(apiUrl(`/workers/scripts/${WORKER}/assets-upload-session`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manifest }),
  });
  const buckets = session?.buckets || [];
  let completionJwt = session?.jwt;
  if (buckets.length === 0) {
    console.log(`Assets: manifest accepted; no changed asset payloads (${Object.keys(manifest).length} files).`);
    return completionJwt;
  }
  for (let index = 0; index < buckets.length; index += 1) {
    const payload = {};
    for (const hash of buckets[index]) {
      const content = contentByHash.get(hash);
      if (!content) throw new Error(`Cloudflare requested unknown asset hash ${hash}.`);
      payload[hash] = content.toString("base64");
    }
    const response = await fetch(`${API_BASE}${apiUrl("/workers/assets/upload")}?base64=true`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok || body.success === false || !body.result?.jwt) {
      const detail = Array.isArray(body.errors)
        ? body.errors.map((e) => `${e.code ?? "unknown"}: ${e.message ?? "unknown"}`).join("; ")
        : `HTTP ${response.status}`;
      throw new Error(`Asset payload ${index + 1}/${buckets.length} failed: ${detail}`);
    }
    completionJwt = body.result.jwt;
    console.log(`Assets: uploaded payload ${index + 1}/${buckets.length}.`);
  }
  if (!completionJwt) throw new Error("Cloudflare did not return an asset completion JWT.");
  return completionJwt;
}

async function queryD1(sql, params = []) {
  return api(apiUrl(`/d1/database/${DB_ID}/query`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
}

async function applyMigrations() {
  const migrationFiles = (await walkFiles(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql"));
  if (!migrationFiles.length) {
    console.log("D1: no migration files found.");
    return;
  }

  try {
    await queryD1("SELECT name FROM d1_migrations LIMIT 1");
  } catch {
    await queryD1(
      "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at INTEGER NOT NULL DEFAULT (unixepoch()))"
    );
  }

  const appliedResult = await queryD1("SELECT name FROM d1_migrations ORDER BY id ASC");
  const applied = new Set((appliedResult?.[0]?.results || []).map((row) => row.name));

  for (const file of migrationFiles) {
    const name = relative(MIGRATIONS_DIR, file).replaceAll("\\", "/");
    if (applied.has(name)) continue;
    const sql = await readFile(file, "utf8");
    if (!sql.trim()) {
      await queryD1("INSERT INTO d1_migrations (name) VALUES (?)", [name]);
      continue;
    }
    console.log(`D1: applying ${name}`);
    await queryD1(sql);
    await queryD1("INSERT INTO d1_migrations (name) VALUES (?)", [name]);
  }
  console.log("D1: migration reconciliation complete.");
}

async function getCurrentBindings() {
  const settings = await api(apiUrl(`/workers/scripts/${WORKER}/settings`));
  const bindings = settings?.bindings || [];
  const inherited = [];
  for (const binding of bindings) {
    if (!binding?.name) continue;
    inherited.push({ name: binding.name, type: "inherit", version_id: "latest" });
  }
  if (!inherited.some((binding) => binding.name === "ASSETS")) {
    inherited.push({ name: "ASSETS", type: "assets" });
  }
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
  const bindings = await getCurrentBindings();
  const files = await walkFiles(SRC_DIR);
  if (!files.some((file) => file === join(SRC_DIR, "entry.js"))) {
    throw new Error("src/entry.js is missing; refusing deployment.");
  }

  const metadata = {
    main_module: "src/entry.js",
    compatibility_date: COMPATIBILITY_DATE,
    compatibility_flags: ["nodejs_compat"],
    assets: {
      jwt: assetJwt,
      config: {
        not_found_handling: "404-page",
        run_worker_first: ["/admin", "/admin/", "/api/*", "/media/*"],
      },
    },
    bindings,
    annotations: {
      "workers/message": `API deploy ${process.env.GITHUB_SHA || "local"}`,
      "workers/tag": process.env.GITHUB_SHA || "api-deploy",
    },
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  for (const file of files) {
    const relativePath = relative(ROOT, file).replaceAll("\\", "/");
    const content = await readFile(file);
    form.append(relativePath, new Blob([content], { type: moduleContentType(file) }), relativePath);
  }

  const response = await fetch(`${API_BASE}${apiUrl(`/workers/scripts/${WORKER}`)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: form,
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    const detail = Array.isArray(body.errors)
      ? body.errors.map((e) => `${e.code ?? "unknown"}: ${e.message ?? "unknown"}`).join("; ")
      : `HTTP ${response.status}`;
    throw new Error(`Worker API upload failed: ${detail}`);
  }
  console.log(`Worker: API upload completed for ${files.length} modules.`);
  return body.result;
}

async function syncSecretsAndRedeploy() {
  const secrets = {};
  for (const name of ["ADMIN_PASSWORD", "ADMIN_RECOVERY_ROTATE_TOKEN"]) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} GitHub secret is absent; refusing production deploy.`);
    secrets[name] = { name, text: value, type: "secret_text" };
  }
  const result = await api(apiUrl(`/workers/scripts/${WORKER}/secrets-bulk`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secrets,
      version_tags: { "workers/tag": process.env.GITHUB_SHA || "api-secret-sync" },
    }),
  });
  console.log("Secrets: bulk synchronization completed without printing secret values.");

  const versions = await api(apiUrl(`/workers/scripts/${WORKER}/versions?deployable=true&per_page=1`));
  const latest = versions?.items?.[0]?.id;
  if (!latest) throw new Error("No deployable Worker version returned after secret synchronization.");

  const deployment = await api(apiUrl(`/workers/scripts/${WORKER}/deployments`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strategy: "percentage",
      versions: [{ percentage: 100, version_id: latest }],
      annotations: {
        "workers/message": `API production deployment ${process.env.GITHUB_SHA || "unknown"}`,
        "workers/triggered_by": "github-actions-api",
      },
    }),
  });
  console.log(`Deployment: 100% traffic assigned to API-created version ${latest}.`);
  return { result, deployment, versionId: latest };
}

async function verifyApiLineage() {
  const deployments = await api(apiUrl(`/workers/scripts/${WORKER}/deployments`));
  const latest = deployments?.deployments?.[0];
  if (!latest) throw new Error("No Cloudflare deployment record returned.");
  const versionId = latest.versions?.[0]?.version_id;
  if (!versionId) throw new Error("Latest Cloudflare deployment has no version ID.");
  const version = await api(apiUrl(`/workers/scripts/${WORKER}/versions/${versionId}`));
  const source = version?.metadata?.source || version?.source || version?.resources?.script?.last_deployed_from;
  if (source && source !== "api") throw new Error(`Unexpected Worker version source: ${source}`);
  console.log(`Cloudflare lineage: deployment=${latest.id}, version=${versionId}, source=${source || "api"}.`);
}

async function main() {
  console.log("=== PHAN THUẦN XTRA — Cloudflare API/REST production controller ===");
  console.log("Wrangler is intentionally not invoked by this controller.");
  await applyMigrations();
  const assetJwt = await uploadAssets();
  await uploadWorker(assetJwt);
  await syncSecretsAndRedeploy();
  await verifyApiLineage();
  console.log("API deployment controller completed successfully.");
}

await main();
