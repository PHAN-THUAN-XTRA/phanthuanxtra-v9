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

// 3) D1 full SQL export using the supported Cloudflare export API.
const exportPath = `/accounts/${accountId}/d1/database/${d1Id}/export`;
let exportState = await cf(exportPath, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ output_format: "polling" }),
});
let bookmark = exportState.result?.at_bookmark;
if (!bookmark) throw new Error("D1 export did not return at_bookmark");
let exportResult;
for (let attempt = 0; attempt < 60; attempt += 1) {
  const poll = await cf(exportPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ output_format: "polling", current_bookmark: bookmark }),
  });
  if (poll.result?.status === "complete" && poll.result?.result?.signed_url) {
    exportResult = poll.result.result;
    break;
  }
  if (poll.result?.at_bookmark) bookmark = poll.result.at_bookmark;
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (!exportResult?.signed_url) throw new Error("D1 export did not complete within polling window");
const d1Response = await fetch(exportResult.signed_url);
if (!d1Response.ok) throw new Error(`D1 signed download failed: ${d1Response.status}`);
await mkdir(dirname(join(root, "d1/production.sql")), { recursive: true });
await writeFile(join(root, "d1/production.sql"), Buffer.from(await d1Response.arrayBuffer()));

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