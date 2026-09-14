const ITERATIONS = 100000;
const KEY_LEN = 256;
const encoder = new TextEncoder();

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function derive(password, salt) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"}, baseKey, KEY_LEN));
}

function equalBytes(a,b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i=0;i<a.length;i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyAdminPassword(env, password) {
  const candidate = String(password || "");
  if (!env.DB || !candidate) return false;

  let row;
  try {
    row = await env.DB.prepare("SELECT password_hash,salt FROM admin_credentials WHERE id=1").first();
  } catch {
    return false;
  }

  if (!row) return candidate === String(env.ADMIN_PASSWORD || "");

  try {
    const hash = await derive(candidate, base64ToBytes(row.salt));
    return equalBytes(hash, base64ToBytes(row.password_hash));
  } catch {
    return false;
  }
}

export async function setAdminPassword(env, password) {
  if (!env.DB) throw new Error("D1 chưa kết nối");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(String(password), salt);
  await env.DB.prepare("INSERT INTO admin_credentials (id,password_hash,salt,updated_at) VALUES (1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash,salt=excluded.salt,updated_at=CURRENT_TIMESTAMP").bind(bytesToBase64(hash), bytesToBase64(salt)).run();
}

export async function verifyAdminRecoveryCode(env, code) {
  const candidate = String(code || "");
  if (!env.DB || !candidate) return false;
  let row;
  try {
    row = await env.DB.prepare("SELECT code_hash,salt FROM admin_recovery_credentials WHERE id=1").first();
  } catch {
    return false;
  }
  if (!row) return candidate === String(env.ADMIN_TOKEN || "");
  try {
    const hash = await derive(candidate, base64ToBytes(row.salt));
    return equalBytes(hash, base64ToBytes(row.code_hash));
  } catch {
    return false;
  }
}

export async function rotateAdminRecoveryCode(env) {
  if (!env.DB) throw new Error("D1 chưa kết nối");
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const code = bytesToBase64Url(raw);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(code, salt);
  await env.DB.prepare("INSERT INTO admin_recovery_credentials (id,code_hash,salt,updated_at) VALUES (1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET code_hash=excluded.code_hash,salt=excluded.salt,updated_at=CURRENT_TIMESTAMP").bind(bytesToBase64(hash), bytesToBase64(salt)).run();
  return code;
}
