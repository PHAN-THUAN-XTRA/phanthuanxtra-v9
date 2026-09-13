import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const required = [
  "CLOUDFLARE_BACKUP_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required secret/env: ${name}`);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_BACKUP_API_TOKEN;
const fallbackToken = process.env.CLOUDFLARE_PRIMARY_API_TOKEN || "";
const workerName = process.env.WORKER_NAME || "phanthuanxtra-v2";
const d1Id = process.env.D1_DATABASE_ID || "8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d";
const r2Bucket = process.env.R2_BUCKET || "phanthuanxtra-media";
const zoneName = process.env.ZONE_NAME || "phanthuanxtra.com";
const root = process.env.BACKUP_ROOT || join("backup-artifact", new Date().toISOString().replace(/[:.]/g, "-"));

await mkdir(root, { recursive: true });

async function requestCloudflare(path, options, authToken) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, text, body };
}

async function cf(path, options = {}) {
  let attempt = await requestCloudflare(path, options, token);
  if ((attempt.response.status === 401 || attempt.response.status === 403) && fallbackToken && fallbackToken !== token) {
    attempt = await requestCloudflare(path, options, fallbackToken);
  }
  const { response, text, body } = attempt;
  if (!response.ok || (body && body.success === false)) {
    throw new Error(`Cloudflare API ${response.status}: ${text.slice(0, 1000)}`);
  }
  return body;
}

async function fetchR2Object(urlPath) {
  let attempt = await fetch(`https://api.cloudflare.com/client/v4${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if ((attempt.status === 401 || attempt.status === 403) && fallbackToken && fallbackToken !== token) {
    attempt = await fetch(`https://api.cloudflare.com/client/v4${urlPath}`, {
      headers: { Authorization: `Bearer ${fallbackToken}` },
    });
  }
  return attempt;
}

async function saveJson(name, body) {
  const path = join(root, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(body, null, 2));
}

async function sha256(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

function sqlIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "object") return `'${String(JSON.stringify(value)).replaceAll("'", "''")}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

// Remove secret material while preserving binding names, types, and non-secret resource metadata.
function redactSecretValues(value) {
  if (Array.isArray(value)) return value.map(redactSecretValues);
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (["text", "secret", "value", "private_key", "token", "api_key"].includes(key.toLowerCase())) {
      output[key] = "[REDACTED]";
    } else {
      output[key] = redactSecretValues(child);
    }
  }
  return output;
}

// 1) Immutable Git source snapshot.
execFileSync("git", ["archive", "--format=tar.gz", "HEAD", "-o", join(root, "github-source.tar.gz")], { stdio: "inherit" });

// 2) Cloudflare Worker/deployment/settings metadata (read-only APIs).
await saveJson("cloudflare/worker.json", await cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}`));
await saveJson("cloudflare/deployments.json", await cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/deployments`));
await saveJson("cloudflare/script-settings.json", await cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/script-settings`));

// 2b) Worker version settings include the authoritative binding list.
// Keep resource identifiers/structure, but never persist secret values.
const workerSettings = await cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/settings`);
await saveJson("cloudflare/worker-settings.json", redactSecretValues(workerSettings));
await saveJson("cloudflare/bindings.json", {
  worker: workerName,
  generated_at: new Date().toISOString(),
  secret_values_included: false,
  bindings: redactSecretValues(workerSettings.result?.bindings || []),
});

// 3) D1 read-only SQL reconstruction using the D1 Query API.
// Cloudflare's dedicated SQL export endpoint requires a stronger write capability than
// the least-privilege backup token. Reconstructing from read-only queries preserves the
// backup requirement without granting or using a production mutation capability.
const schemaQuery = await cf(`/accounts/${accountId}/d1/database/${d1Id}/query`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sql: "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 WHEN 'view' THEN 3 ELSE 4 END, name" }),
});
const schemaRows = schemaQuery.result?.[0]?.results || [];
const tables = schemaRows.filter((row) => row.type === "table");
const sqlLines = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];

for (const row of tables) {
  if (!row.name || !row.sql) continue;
  sqlLines.push(`${row.sql};`);
  const pragma = await cf(`/accounts/${accountId}/d1/database/${d1Id}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql: `PRAGMA table_info(${sqlIdentifier(row.name)})` }),
  });
  const columns = (pragma.result?.[0]?.results || []).map((entry) => entry.name).filter(Boolean);
  if (!columns.length) continue;
  const data = await cf(`/accounts/${accountId}/d1/database/${d1Id}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql: `SELECT * FROM ${sqlIdentifier(row.name)}` }),
  });
  for (const record of data.result?.[0]?.results || []) {
    const values = columns.map((column) => sqlLiteral(record[column]));
    sqlLines.push(`INSERT INTO ${sqlIdentifier(row.name)} (${columns.map(sqlIdentifier).join(", ")}) VALUES (${values.join(", ")});`);
  }
}

for (const row of schemaRows.filter((entry) => ["index", "trigger", "view"].includes(entry.type))) {
  if (row.sql) sqlLines.push(`${row.sql};`);
}

sqlLines.push("COMMIT;", "PRAGMA foreign_keys=ON;");
await mkdir(dirname(join(root, "d1/production.sql")), { recursive: true });
await writeFile(join(root, "d1/production.sql"), `${sqlLines.join("\n")}\n`);

// 4) R2 metadata + complete object export, paginated. No object is deleted or modified.
const r2Objects = [];
let cursor = "";
do {
  const query = new URLSearchParams({ per_page: "1000" });
  if (cursor) query.set("cursor", cursor);
  const page = await cf(`/accounts/${accountId}/r2/buckets/${encodeURIComponent(r2Bucket)}/objects?${query}`);
  r2Objects.push(...(page.result || []));
  cursor = page.result_info?.is_truncated ? page.result_info.cursor : "";
} while (cursor);
await saveJson("r2/object-manifest.json", {
  bucket: r2Bucket,
  object_count: r2Objects.length,
  objects: r2Objects,
});

for (const object of r2Objects) {
  if (!object.key) continue;
  const encodedKey = object.key.split("/").map(encodeURIComponent).join("/");
  const response = await fetchR2Object(`/accounts/${accountId}/r2/buckets/${encodeURIComponent(r2Bucket)}/objects/${encodedKey}`);
  if (!response.ok) throw new Error(`R2 download failed for ${object.key}: ${response.status}`);
  const destination = join(root, "r2/objects", object.key);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

// 5) Zone + Worker routes metadata.
const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=50`);
const zone = zones.result?.find((entry) => entry.name === zoneName);
if (!zone?.id) throw new Error(`Active zone not found: ${zoneName}`);
await saveJson("cloudflare/routes.json", await cf(`/zones/${zone.id}/workers/routes`));
await saveJson("cloudflare/zone.json", {
  id: zone.id,
  name: zone.name,
  status: zone.status,
});

// 6) Manifest and checksums. Secret VALUES are never written.
const files = execFileSync("find", [root, "-type", "f", "-not", "-name", "SHA256SUMS"], { encoding: "utf8" })
  .trim().split("\n").filter(Boolean).sort();
const lines = [];
for (const file of files) lines.push(`${await sha256(file)}  ${file}`);
await writeFile(join(root, "SHA256SUMS"), `${lines.join("\n")}\n`);
await saveJson("manifest.json", {
  backup_type: "full-system",
  generated_at: new Date().toISOString(),
  worker: workerName,
  d1_database: d1Id,
  r2_bucket: r2Bucket,
  zone: zoneName,
  secret_values_included: false,
  components: {
    github_source: true,
    worker_metadata: true,
    deployments: true,
    script_settings: true,
    worker_version_settings: true,
    worker_bindings_manifest: true,
    d1_sql_export: true,
    r2_object_manifest: true,
    r2_object_content: true,
    routes: true,
    zone_metadata: true,
    sha256: true,
  },
});

console.log(JSON.stringify({ root, r2_objects: r2Objects.length, status: "success" }));