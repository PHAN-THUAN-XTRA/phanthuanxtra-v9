import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/dual-gateway.js';

const env = {
  GATEWAY_READ_TOKEN: 'test-token',
  GATEWAY_ALLOWED_ORIGINS: 'https://example.com',
  DUAL_AI_ENABLED: 'true',
  DUAL_AI_DEEP_MODEL: '@cf/nvidia/nemotron-3-120b-a12b',
  DUAL_AI_WIDE_MODEL: '@cf/zai-org/glm-4.7-flash',
  PRODUCTION_MUTATIONS_ENABLED: 'false',
  APK_RATE_LIMITER: { limit: async () => ({ success: true }) },
  AI: { run: async () => ({ response: 'peer-result' }) }
};

test('dual Workers AI calls Wide then Deep and stays isolated', async () => {
  const calls = [];
  const testEnv = { ...env, AI: { run: async (model) => { calls.push(model); return { response: model }; } } };
  const response = await worker.fetch(new Request('https://gateway.example.com/v1/ai/unified', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: 'gate10-test', mode: 'audit', instruction: 'Validate Gate 10', context: 'checkpoint' })
  }), testEnv);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.dual_workers_ai, true);
  assert.equal(body.isolated, true);
  assert.equal(body.execution, 'serialized');
  assert.deepEqual(body.runtime_order, ['wide', 'deep']);
  assert.equal(body.production_mutation, false);
  assert.deepEqual(calls, [
    '@cf/zai-org/glm-4.7-flash',
    '@cf/nvidia/nemotron-3-120b-a12b'
  ]);
});

test('dual endpoint rejects unauthenticated requests', async () => {
  const response = await worker.fetch(new Request('https://gateway.example.com/v1/ai/unified', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction: 'test' })
  }), env);
  assert.equal(response.status, 401);
});

test('dual endpoint never enables production mutation', async () => {
  const response = await worker.fetch(new Request('https://gateway.example.com/v1/ai/unified', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction: 'test' })
  }), env);
  const body = await response.json();
  assert.equal(body.production_mutation, false);
});


test('dual endpoint returns 429 when APK limiter rejects request', async () => {
  const limitedEnv = { ...env, APK_RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const response = await worker.fetch(new Request('https://gateway.example.com/v1/ai/unified', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction: 'test' })
  }), limitedEnv);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  const body = await response.json();
  assert.equal(body.error, 'rate_limit_exceeded');
  assert.equal(body.limit, 50);
  assert.equal(body.period_seconds, 60);
});
