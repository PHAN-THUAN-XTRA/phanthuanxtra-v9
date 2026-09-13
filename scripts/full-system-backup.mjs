// Gate 14: use Cloudflare's native D1 export path so internal _cf_KV metadata is never queried.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_EFFECTIVE_API_TOKEN || process.env.CLOUDFLARE_BACKUP_API_TOKEN || process.env.CLOUDFLARE_PRIMARY_API_TOKEN || "";
const d1Token = process.env.CLOUDFLARE_D1_API_TOKEN || token;
const fallbackToken = process.env.CLOUDFLARE_PRIMARY_API_TOKEN || "";
if (!accountId) throw new Error("Missing required secret/env: CLOUDFLARE_ACCOUNT_ID");
if (!token) throw new Error("Missing required Cloudflare API token");
const workerName = process.env.WORKER_NAME || "phanthuanxtra-v2";
const d1Id = process.env.D1_DATABASE_ID || "8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d";
const r2Bucket = process.env.R2_BUCKET || "phanthuanxtra-media";
const zoneName = process.env.ZONE_NAME || "phanthuanxtra.com";
const root = process.env.BACKUP_ROOT || join("backup-artifact", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(root, { recursive: true });

function requestCloudflare(path, options = {}, authToken = token) {
  const args = ["-sS", "-X", options.method || "GET", "-H", `Authorization: Bearer ${authToken}`];
  for (const [name, value] of Object.entries(options.headers || {})) args.push("-H", `${name}: ${value}`);
  if (options.body) args.push("--data", options.body);
  args.push("-w", "\n__CF_STATUS__%{http_code}", `https://api.cloudflare.com/client/v4${path}`);
  const output = execFileSync("curl", args, { encoding: "utf8" });
  const marker = "\n__CF_STATUS__";
  const i = output.lastIndexOf(marker);
  const text = i >= 0 ? output.slice(0, i) : output;
  const status = i >= 0 ? Number(output.slice(i + marker.length).trim()) : 0;
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status, ok: status >= 200 && status < 300, text, body };
}
function cf(path, options = {}) {
  let attempt = requestCloudflare(path, options, token);
  if ((!attempt.ok || attempt.body?.success === false) && fallbackToken && fallbackToken !== token && [400, 401, 403].includes(attempt.status)) attempt = requestCloudflare(path, options, fallbackToken);
  if (!attempt.ok || attempt.body?.success === false) throw new Error(`Cloudflare API ${attempt.status}: ${attempt.text.slice(0, 1000)}`);
  return attempt.body;
}
function cfD1(path, options = {}) {
  const attempt = requestCloudflare(path, options, d1Token);
  if (!attempt.ok || attempt.body?.success === false) throw new Error(`Cloudflare D1 API ${attempt.status}: ${attempt.text.slice(0, 1000)}`);
  return attempt.body;
}
async function saveJson(name, body) { const path = join(root, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(body, null, 2)); }
async function sha256(path) { const hash = createHash("sha256"); hash.update(await readFile(path)); return hash.digest("hex"); }
function redactSecretValues(value) { if (Array.isArray(value)) return value.map(redactSecretValues); if (!value || typeof value !== "object") return value; const out = {}; for (const [key, child] of Object.entries(value)) out[key] = ["text", "secret", "value", "private_key", "token", "api_key"].includes(key.toLowerCase()) ? "[REDACTED]" : redactSecretValues(child); return out; }
function downloadR2Object(urlPath, destination, authToken) { const args = ["-sS", "-L", "-o", destination, "-H", `Authorization: Bearer ${authToken}`, "-w", "%{http_code}", `https://api.cloudflare.com/client/v4${urlPath}`]; const status = Number(execFileSync("curl", args, { encoding: "utf8" }).trim()); if (status >= 200 && status < 300) return; throw new Error(`R2 download failed: ${status}`); }
async function exportD1Sql(destination) {
  const path = `/accounts/${accountId}/d1/database/${d1Id}/export`;
  let currentBookmark = "";
  for (let attempt = 1; attempt <= 90; attempt++) {
    const body = cfD1(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ output_format: "polling", ...(currentBookmark ? { current_bookmark: currentBookmark } : {}) }) });
    const result = body.result || {};
    if (result.status === "error") throw new Error(`Cloudflare D1 export error: ${String(result.error || "unknown").slice(0, 1000)}`);
    const signedUrl = result.result?.signed_url;
    if (result.status === "complete" && signedUrl) {
      const status = Number(execFileSync("curl", ["-sS", "-L", "-o", destination, "-w", "%{http_code}", signedUrl], { encoding: "utf8" }).trim());
      if (status < 200 || status >= 300) throw new Error(`D1 export download failed: ${status}`);
      return;
    }
    currentBookmark = result.at_bookmark || currentBookmark;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("D1 export polling timed out after 90 attempts");
}

execFileSync("git", ["archive", "--format=tar.gz", "HEAD", "-o", join(root, "github-source.tar.gz")], { stdio: "inherit" });
await saveJson("cloudflare/worker.json", cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}`));
await saveJson("cloudflare/deployments.json", cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/deployments`));
await saveJson("cloudflare/script-settings.json", cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/script-settings`));
const workerSettings = cf(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/settings`);
await saveJson("cloudflare/worker-settings.json", redactSecretValues(workerSettings));
await saveJson("cloudflare/bindings.json", { worker: workerName, generated_at: new Date().toISOString(), secret_values_included: false, bindings: redactSecretValues(workerSettings.result?.bindings || []) });

await mkdir(join(root, "d1"), { recursive: true });
await exportD1Sql(join(root, "d1/production.sql"));

const r2Objects = []; let cursor = "";
do {
  const query = new URLSearchParams({ per_page: "1000" }); if (cursor) query.set("cursor", cursor);
  const page = cf(`/accounts/${accountId}/r2/buckets/${encodeURIComponent(r2Bucket)}/objects?${query}`);
  r2Objects.push(...(page.result || [])); cursor = page.result_info?.is_truncated ? page.result_info.cursor : "";
} while (cursor);
await saveJson("r2/object-manifest.json", { bucket: r2Bucket, object_count: r2Objects.length, objects: r2Objects });
for (const object of r2Objects) { if (!object.key) continue; const encodedKey = object.key.split("/").map(encodeURIComponent).join("/"); const destination = join(root, "r2/objects", object.key); await mkdir(dirname(destination), { recursive: true }); downloadR2Object(`/accounts/${accountId}/r2/buckets/${encodeURIComponent(r2Bucket)}/objects/${encodedKey}`, destination, token); }

const zones = cf(`/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=50`); const zone = zones.result?.find(entry => entry.name === zoneName); if (!zone?.id) throw new Error(`Active zone not found: ${zoneName}`);
await saveJson("cloudflare/routes.json", cf(`/zones/${zone.id}/workers/routes`));
await saveJson("cloudflare/zone.json", { id: zone.id, name: zone.name, status: zone.status });
const files = execFileSync("find", [root, "-type", "f", "-not", "-name", "SHA256SUMS"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
const lines = []; for (const file of files) lines.push(`${await sha256(file)}  ${file}`); await writeFile(join(root, "SHA256SUMS"), `${lines.join("\n")}\n`);
await saveJson("manifest.json", { backup_type: "full-system", generated_at: new Date().toISOString(), worker: workerName, d1_database: d1Id, r2_bucket: r2Bucket, zone: zoneName, secret_values_included: false, components: { github_source: true, worker_metadata: true, deployments: true, script_settings: true, worker_version_settings: true, worker_bindings_manifest: true, d1_sql_export: true, r2_object_manifest: true, r2_object_content: true, routes: true, zone_metadata: true, sha256: true } });
console.log(JSON.stringify({ root, r2_objects: r2Objects.length, status: "success" }));
