import { verifyAdminToken } from "./admin-auth.js";

// Existing signed, short-lived Admin sessions remain the default.
// GitHub Actions additionally uses a purpose-bound HMAC over a two-minute
// request window; it never sends an Admin password, API key or bearer token.
export const BREVO_DIAGNOSTIC_PATH = "/api/admin/integrations/brevo/diagnostic";

export async function verifyBrevoDiagnosticAuth(request, env = {}, now = Date.now()) {
  if ((await verifyAdminToken(request, env)).ok) return { ok: true, principal: "admin", nonce: null };

  const password = String(env.ADMIN_PASSWORD || "");
  const timestamp = String(request.headers.get("x-ptx-brevo-timestamp") || "");
  const nonce = String(request.headers.get("x-ptx-brevo-nonce") || "");
  const signature = String(request.headers.get("x-ptx-brevo-signature") || "");
  if (
    !password ||
    !/^[0-9]{10}$/.test(timestamp) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce) ||
    !/^[0-9a-f]{64}$/i.test(signature) ||
    Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 120 ||
    !["GET", "POST"].includes(request.method) ||
    new URL(request.url).pathname !== BREVO_DIAGNOSTIC_PATH
  ) return { ok: false };

  const message = ["ptx-brevo-diagnostic-v1", request.method, BREVO_DIAGNOSTIC_PATH, timestamp, nonce].join("\n");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const bytes = Uint8Array.from(signature.match(/.{2}/g), part => parseInt(part, 16));
  const valid = await crypto.subtle.verify("HMAC", key, bytes, encoder.encode(message));
  return valid ? { ok: true, principal: "ci", nonce } : { ok: false };
}
