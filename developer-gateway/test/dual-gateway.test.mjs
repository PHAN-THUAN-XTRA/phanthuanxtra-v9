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
  assert.equal(body.routing_policy, 'zero-cost-first');
  assert.equal(body.selected_provider, 'cloudflare-workers-ai');
  assert.equal(body.fallback_used, true);
  assert.equal(body.fallback_reason, 'gemini_disabled');
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


test('Gemini is selected first when configured and Workers AI is not called', async () => {
  let workersCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'gemini-result' }] } }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const testEnv = {
      ...env,
      GEMINI_ENABLED: 'true',
      GEMINI_API_KEY: ['unit', 'fixture'].join('-'),
      GEMINI_MODEL: 'gemini-3.5-flash-lite',
      AI: { run: async () => { workersCalls += 1; return { response: 'unexpected' }; } }
    };
    const response = await worker.fetch(new Request('https://gateway.example.com/v1/ai/unified', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: 'test zero cost routing' })
    }), testEnv);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.selected_provider, 'gemini');
    assert.equal(body.fallback_used, false);
    assert.equal(body.production_mutation, false);
    assert.equal(body.response, 'gemini-result');
    assert.equal(workersCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('Gemini HTTP failure exposes only safe diagnostic fields and falls back', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 429, message: 'quota detail must not be propagated', status: 'RESOURCE_EXHAUSTED' }
  }), { status: 429, headers: { 'content-type': 'application/json' } });

  const aiCalls = [];
  const env = {
    GEMINI_ENABLED: 'true',
    GEMINI_API_KEY: ['unit', 'fixture'].join('-'),
    GEMINI_MODEL: 'gemini-3.5-flash-lite',
    AI: {
      run: async (model) => {
        aiCalls.push(model);
        return { response: 'workers fallback' };
      }
    }
  };

  try {
    const readToken = ['unit', 'read', 'fixture'].join('-');
    const request = new Request('https://gateway.test/v1/ai/unified', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${readToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ instruction: 'diagnostic test' })
    });
    env.GATEWAY_READ_TOKEN = readToken;
    const response = await worker.fetch(request, env);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.selected_provider, 'cloudflare-workers-ai');
    assert.equal(body.fallback_used, true);
    assert.equal(body.fallback_reason, 'gemini_http_failed');
    assert.equal(body.fallback_status, 429);
    assert.equal(body.fallback_provider_code, 'RESOURCE_EXHAUSTED');
    assert.equal(body.production_mutation, false);
    assert.equal(JSON.stringify(body).includes('quota detail must not be propagated'), false);
    assert.equal(aiCalls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('Gemini auto discovery selects an available generateContent model before generation', async () => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    if (String(url).includes('/v1beta/models?')) {
      return new Response(JSON.stringify({ models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['countTokens'] },
        { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }
      ] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'discovered-gemini-result' }] } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  };
  let workersCalls = 0;
  try {
    const readToken = ['unit', 'read', 'discovery'].join('-');
    const testEnv = { ...env, GATEWAY_READ_TOKEN: readToken, GEMINI_ENABLED: 'true',
      GEMINI_API_KEY: ['unit', 'gemini', 'fixture'].join('-'), GEMINI_MODEL: 'auto',
      AI: { run: async () => { workersCalls += 1; return { response: 'unexpected' }; } } };
    const response = await worker.fetch(new Request('https://gateway.test/v1/ai/unified', {
      method: 'POST', headers: { Authorization: `Bearer ${readToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ instruction: 'test model discovery' })
    }), testEnv);
    const body = await response.json();
    assert.equal(body.selected_provider, 'gemini');
    assert.equal(body.model, 'gemini-3.5-flash-lite');
    assert.equal(body.response, 'discovered-gemini-result');
    assert.equal(body.production_mutation, false);
    assert.equal(workersCalls, 0);
    assert.equal(urls.some(url => url.includes('/v1beta/models?')), true);
    assert.equal(urls.some(url => url.includes('/models/gemini-3.5-flash-lite:generateContent')), true);
  } finally { globalThis.fetch = originalFetch; }
});
