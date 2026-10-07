import { CONTENT_PREP_ACTIONS } from './content-prep-contract.js';

const encoder = new TextEncoder();
const PREFIX = 'ptxprep1';
const signingSecret = env => String(env.ADMIN_TOKEN || env.ADMIN_PASSWORD || '');
const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
}
async function key(env) {
  return crypto.subtle.importKey('raw', encoder.encode(signingSecret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export const validPipeline = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(value);

export async function issueContentPrepToken(env, { agent_id, pipeline_id, ttl_seconds = 900 }, now = Date.now()) {
  if (!Object.hasOwn(CONTENT_PREP_ACTIONS, agent_id) || !validPipeline(pipeline_id) || !Number.isInteger(ttl_seconds) || ttl_seconds < 60 || ttl_seconds > 3600)
    throw new Error('agent_id, pipeline_id hoặc ttl_seconds không hợp lệ.');
  if (!signingSecret(env)) throw new Error('Signing secret unavailable');
  const iat = Math.floor(now / 1000);
  const claims = { aud: 'content-prep/v1', agent_id, action: CONTENT_PREP_ACTIONS[agent_id], pipeline_id, iat, exp: iat + ttl_seconds, nonce: crypto.randomUUID() };
  const payload = `${PREFIX}.${encode(encoder.encode(JSON.stringify(claims)))}`;
  const signature = await crypto.subtle.sign('HMAC', await key(env), encoder.encode(payload));
  return { token: `${payload}.${encode(new Uint8Array(signature))}`, expires_at: new Date(claims.exp * 1000).toISOString(), agent_id, action: claims.action, pipeline_id };
}

export async function verifyContentPrepToken(request, env, now = Date.now()) {
  if (!signingSecret(env)) return null;
  const header = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, '');
  if (token.length > 1500) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  try {
    const signature = decode(parts[2]);
    if (signature.length !== 32 || !await crypto.subtle.verify('HMAC', await key(env), signature, encoder.encode(`${PREFIX}.${parts[1]}`))) return null;
    const claims = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decode(parts[1])));
    const seconds = Math.floor(now / 1000);
    if (claims.aud !== 'content-prep/v1' || !Object.hasOwn(CONTENT_PREP_ACTIONS, claims.agent_id) || claims.action !== CONTENT_PREP_ACTIONS[claims.agent_id] || !validPipeline(claims.pipeline_id) ||
        !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) || claims.iat > seconds || claims.exp <= seconds || claims.exp - claims.iat < 60 || claims.exp - claims.iat > 3600) return null;
    return claims;
  } catch { return null; }
}
