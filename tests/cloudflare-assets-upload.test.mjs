import test from 'node:test';
import assert from 'node:assert/strict';
import { createBucketBody, simulateAssetUpload, uploadAssetsWithRest } from '../scripts/cloudflare-assets-upload.mjs';

test('asset simulation preserves bucket grouping and base64 payloads', async () => {
  const result = await simulateAssetUpload({ transport: 'rest' });
  assert.equal(result.requests.length, 2);
  assert.deepEqual(result.requests.map((request) => request.fields.length), [1, 1]);
  assert.ok(result.completionJwt.startsWith('SIMULATION_COMPLETION_'));
  assert.equal(result.requests[0].auth, 'short-lived-jwt');
});

test('asset body uses hash fields and base64 raw bytes', () => {
  const content = new Map([['0123456789abcdef0123456789abcdef', Buffer.from('hello')]]);
  const body = createBucketBody(['0123456789abcdef0123456789abcdef'], content);
  assert.deepEqual(Object.keys(body), ['0123456789abcdef0123456789abcdef']);
  assert.equal(body['0123456789abcdef0123456789abcdef'], Buffer.from('hello').toString('base64'));
});

test('REST protocol accepts the documented 201 completion response', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ success: true, result: { jwt: 'COMPLETION_JWT' } }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  };
  const session = { jwt: 'UPLOAD_JWT', buckets: [['0123456789abcdef0123456789abcdef']] };
  const content = new Map([['0123456789abcdef0123456789abcdef', Buffer.from('hello')]]);
  const jwt = await uploadAssetsWithRest({ apiBase: 'https://api.cloudflare.test/client/v4', accountId: 'a'.repeat(32), session, contentByHash: content, fetchImpl, log: () => {} });
  assert.equal(jwt, 'COMPLETION_JWT');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /workers\/assets\/upload\?base64=true$/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer UPLOAD_JWT');
});

test('REST protocol rejects a non-201 asset response with sanitized error details', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ success: false, errors: [{ code: 1000, message: 'invalid upload payload' }] }), { status: 400 });
  const session = { jwt: 'UPLOAD_JWT', buckets: [['0123456789abcdef0123456789abcdef']] };
  const content = new Map([['0123456789abcdef0123456789abcdef', Buffer.from('hello')]]);
  await assert.rejects(
    uploadAssetsWithRest({ apiBase: 'https://api.cloudflare.test/client/v4', accountId: 'a'.repeat(32), session, contentByHash: content, fetchImpl, log: () => {} }),
    /1000: invalid upload payload/,
  );
});
