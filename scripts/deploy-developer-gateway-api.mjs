import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const WORKER = "phanthuanxtra-developer-gateway";
const ROOT = resolve(process.cwd(), "developer-gateway");
const SRC_DIR = resolve(ROOT, "src");

if (!ACCOUNT_ID || !/^[0-9a-fA-F]{32}$/.test(ACCOUNT_ID)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID is required and must be a 32-character account ID.");
}
if (!TOKEN) throw new Error("CLOUDFLARE_API_TOKEN is required.");

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {}),
    },
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

function pathForWorker(path) {
  return `/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER}${path}`;
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

async function currentBindings() {
  const settings = await api(pathForWorker("/settings"));
  const bindings = settings?.bindings || [];
  return bindings
    .filter((binding) => binding?.name)
    .map((binding) => ({ name: binding.name, type: "inherit", version_id: "latest" }));
}

async function uploadWorker() {
  const files = await walkFiles(SRC_DIR);
  const main = join(SRC_DIR, "dual-gateway.js");
  if (!files.includes(main)) throw new Error("developer-gateway/src/dual-gateway.js is missing.");

  const metadata = {
    main_module: "developer-gateway/src/dual-gateway.js",
    compatibility_date: "2026-08-11",
    compatibility_flags: ["nodejs_compat"],
    bindings: [
      ...(await currentBindings()).filter(binding => binding.name !== "APK_RATE_LIMITER"),
      { name: "APK_RATE_LIMITER", type: "ratelimit", namespace_id: "2026092450", simple: { limit: 50, period: 60 } },
    ],
    annotations: {
      "workers/message": `API gateway deploy ${process.env.GITHUB_SHA || "local"}`,
      "workers/tag": process.env.GITHUB_SHA || "api-gateway-deploy",
    },
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  for (const file of files) {
    const relativePath = relative(process.cwd(), file).replaceAll("\\", "/");
    const content = await readFile(file);
    const contentType = [".js", ".mjs"].includes(extname(file).toLowerCase())
      ? "application/javascript+module"
      : "text/plain";
    form.append(relativePath, new Blob([content], { type: contentType }), relativePath);
  }

  const response = await fetch(`${API_BASE}${pathForWorker("")}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    const detail = Array.isArray(body.errors)
      ? body.errors.map((e) => `${e.code ?? "unknown"}: ${e.message ?? "unknown"}`).join("; ")
      : `HTTP ${response.status}`;
    throw new Error(`Gateway API upload failed: ${detail}`);
  }
  console.log(`Gateway: API upload completed for ${files.length} modules.`);
}

async function syncSecretAndDeploy() {
  const value = process.env.GATEWAY_READ_TOKEN;
  if (!value) throw new Error("GATEWAY_READ_TOKEN GitHub secret is absent; refusing gateway production deploy.");

  await api(pathForWorker("/secrets-bulk"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secrets: {
        GATEWAY_READ_TOKEN: {
          name: "GATEWAY_READ_TOKEN",
          text: value,
          type: "secret_text",
        },
      },
      version_tags: { "workers/tag": process.env.GITHUB_SHA || "api-gateway-secret-sync" },
    }),
  });
  console.log("Gateway secret: bulk synchronization completed without printing the secret value.");

  const versions = await api(pathForWorker("/versions?deployable=true&per_page=1"));
  const versionId = versions?.items?.[0]?.id;
  if (!versionId) throw new Error("No deployable gateway version returned after secret synchronization.");

  await api(pathForWorker("/deployments"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strategy: "percentage",
      versions: [{ percentage: 100, version_id: versionId }],
      annotations: {
        "workers/message": `API gateway production deployment ${process.env.GITHUB_SHA || "unknown"}`,
      },
    }),
  });
  console.log(`Gateway deployment: 100% traffic assigned to API-created version ${versionId}.`);
}

await uploadWorker();
await syncSecretAndDeploy();
console.log("Developer Gateway Cloudflare API deployment completed successfully.");
