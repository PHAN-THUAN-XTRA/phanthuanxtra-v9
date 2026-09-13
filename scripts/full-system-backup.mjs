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