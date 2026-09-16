export const ASSET_UPLOAD_ENDPOINT = '/workers/assets/upload';

function formatApiErrors(body, status, statusText = '') {
  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((error) => `${error.code ?? 'unknown'}: ${error.message ?? 'unknown'}`).join('; ');
  }
  if (typeof body?.raw === 'string' && body.raw.trim()) return body.raw.slice(0, 800);
  return `HTTP ${status}${statusText ? ` ${statusText}` : ''}`;
}

async function readResponse(response) {
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { body, text };
}

export function validateSession(session) {
  if (!session?.jwt || typeof session.jwt !== 'string') throw new Error('Assets upload session did not return a JWT.');
  if (!Array.isArray(session.buckets)) throw new Error('Assets upload session did not return buckets.');
}

export function validateBucket(bucket, contentByHash) {
  if (!Array.isArray(bucket) || bucket.length === 0) throw new Error('Cloudflare returned an empty asset bucket.');
  for (const hash of bucket) {
    if (!/^[0-9a-f]{32}$/.test(hash)) throw new Error(`Cloudflare returned an invalid asset hash: ${hash}`);
    if (!contentByHash.has(hash)) throw new Error(`Cloudflare requested unknown asset hash ${hash}.`);
  }
}

export function createBucketBody(bucket, contentByHash) {
  validateBucket(bucket, contentByHash);
  return Object.fromEntries(bucket.map((hash) => [hash, contentByHash.get(hash).toString('base64')]));
}

export async function uploadAssetsWithRest({ apiBase, accountId, session, contentByHash, fetchImpl = fetch, log = console.log }) {
  validateSession(session);
  const buckets = session.buckets;
  if (buckets.length === 0) return session.jwt;
  let completionJwt = null;
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    const form = new FormData();
    for (const [hash, base64] of Object.entries(createBucketBody(bucket, contentByHash))) form.append(hash, base64);
    const response = await fetchImpl(`${apiBase}/accounts/${accountId}${ASSET_UPLOAD_ENDPOINT}?base64=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.jwt}` },
      body: form,
    });
    const { body } = await readResponse(response);
    if (response.status !== 201 || body.success === false || !body.result?.jwt) {
      throw new Error(`Asset payload ${index + 1}/${buckets.length} failed: ${formatApiErrors(body, response.status, response.statusText)}.`);
    }
    completionJwt = body.result.jwt;
    log(`Assets REST: uploaded bucket ${index + 1}/${buckets.length}.`);
  }
  return completionJwt;
}

export async function uploadAssetsWithSdk({ Cloudflare, apiToken, accountId, session, contentByHash, log = console.log }) {
  validateSession(session);
  if (!apiToken || typeof apiToken !== 'string') throw new Error('Cloudflare SDK API token is required.');
  const buckets = session.buckets;
  if (buckets.length === 0) return session.jwt;
  let completionJwt = null;
  for (let index = 0; index < buckets.length; index += 1) {
    const body = createBucketBody(buckets[index], contentByHash);
    const client = new Cloudflare({ apiToken });
    try {
      const response = await client.workers.assets.upload.create(
        { account_id: accountId, base64: true, body },
        { headers: { Authorization: `Bearer ${session.jwt}` } },
      );
      const resultJwt = response?.jwt ?? response?.result?.jwt;
      if (!resultJwt) throw new Error('Cloudflare SDK returned no completion JWT.');
      completionJwt = resultJwt;
    } catch (error) {
      throw new Error(`Asset payload ${index + 1}/${buckets.length} failed through SDK: ${error instanceof Error ? error.message : String(error)}`);
    }
    log(`Assets SDK: uploaded bucket ${index + 1}/${buckets.length}.`);
  }
  return completionJwt;
}

export async function simulateAssetUpload({ transport, session = { jwt: 'SIMULATION_SESSION_JWT', buckets: [['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'], ['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb']] }, contentByHash = new Map([
  ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', Buffer.from('asset-a')],
  ['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', Buffer.from('asset-b')],
]), log = () => {} }) {
  validateSession(session);
  const requests = [];
  let completionJwt = null;
  for (let index = 0; index < session.buckets.length; index += 1) {
    const body = createBucketBody(session.buckets[index], contentByHash);
    requests.push({ transport, bucket: index + 1, fields: Object.keys(body), base64: Object.values(body), auth: 'short-lived-jwt' });
    completionJwt = `SIMULATION_COMPLETION_${index + 1}`;
    log(`Simulation ${transport}: bucket ${index + 1}/${session.buckets.length} accepted.`);
  }
  return { completionJwt: completionJwt || session.jwt, requests };
}
