import test from 'node:test';
import assert from 'node:assert/strict';
import { lookup, formatCar, handleTelegramLookup } from '../src/telegram-lookup.js';

test('lookup authentication fails closed and validates only the standard Telegram header', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network access'); });
  const DB = { prepare() { throw new Error('Unexpected database access'); } };
  for (const secret of [undefined, '', 'test-secret']) {
    for (const headers of [{}, { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }, { 'X-Telegram-Lookup-Webhook-Secret': 'test-secret' }, { 'X-Telegram-Bot-Api-Secret-Token': 'test-secret' }]) {
      const request = new Request('https://example.com/api/telegram/lookup-webhook', { method: 'POST', headers, body: '{}' });
      const accepted = secret === 'test-secret' && headers['X-Telegram-Bot-Api-Secret-Token'] === secret;
      if (!accepted) request.json = () => { throw new Error('Unauthenticated body parsed'); };
      const response = await handleTelegramLookup(request, { DB, TELEGRAM_LOOKUP_WEBHOOK_SECRET: secret });
      assert.equal(response.status, !secret ? 503 : accepted ? 200 : 401);
      if (accepted) assert.deepEqual(await response.json(), { ok: true, ignored: true });
    }
  }
});

test('lookup registration requires and sends secret_token', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true, result: true }));
  });
  const request = () => new Request('https://example.com/api/admin/telegram/lookup-webhook', { method: 'POST', headers: { Authorization: 'Bearer admin-fixture' } });
  const env = { ADMIN_TOKEN: 'admin-fixture', TELEGRAM_LOOKUP_BOT_TOKEN: 'fixture' };
  for (const secret of [undefined, '']) {
    assert.equal((await handleTelegramLookup(request(), { ...env, TELEGRAM_LOOKUP_WEBHOOK_SECRET: secret })).status, 503);
  }
  assert.equal(calls.length, 0);
  assert.equal((await handleTelegramLookup(request(), { ...env, TELEGRAM_LOOKUP_WEBHOOK_SECRET: 'test-secret' })).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].secret_token, 'test-secret');
});

function dbFor(car) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM cars')) return car;
              return null;
            },
            async all() {
              if (sql.includes('SELECT url FROM car_images')) return { results: [{ url: '/media/car-1.jpg' }] };
              return { results: [] };
            }
          };
        }
      };
    }
  };
}

test('correct Telegram secret preserves lookup and reply workflow', async t => {
  const replies = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    replies.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true, result: true }));
  });
  const response = await handleTelegramLookup(new Request('https://example.com/api/telegram/lookup-webhook', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': 'test-secret' },
    body: JSON.stringify({ message: { chat: { id: 123 }, text: '/search LX 600' } }),
  }), { TELEGRAM_LOOKUP_WEBHOOK_SECRET: 'test-secret', TELEGRAM_LOOKUP_BOT_TOKEN: 'fixture', DB: dbFor({ id: 'lx600', brand: 'Lexus', model: 'LX 600' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, found: true, id: 'lx600' });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].chat_id, '123');
  assert.match(replies[0].text, /Lexus LX 600/);
});

test('lookup returns production car fields and associated media', async () => {
  const car = await lookup(dbFor({ id: 'lx600', brand: 'Lexus', model: 'LX 600', year: 2026, mileage: 1800, price: 9000000000, status: 'available' }), 'LX 600');
  assert.equal(car.id, 'lx600');
  assert.deepEqual(car.images, ['/media/car-1.jpg']);
});

test('lookup response is grounded and states unavailable registration data explicitly', () => {
  const text = formatCar({ id: 'lx600', brand: 'Lexus', model: 'LX 600', year: 2026, mileage: 1800, price: 9000000000, status: 'available', images: [] });
  assert.match(text, /Lexus LX 600/);
  assert.match(text, /Đăng ký\/đăng kiểm/);
  assert.match(text, /chưa có dữ liệu/);
});

test('lookup webhook rejects GET and exposes POST contract', async () => {
  const response = await handleTelegramLookup(new Request('https://example.com/api/telegram/lookup-webhook', { method: 'GET' }), {});
  assert.equal(response, null);
});


test('lookup webhook fails closed when secret is missing', async () => {
  const response = await handleTelegramLookup(new Request('https://example.com/api/telegram/lookup-webhook', { method: 'POST' }), {});
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Webhook secret is not configured/);
});

test('lookup webhook rejects an invalid Telegram secret', async () => {
  const response = await handleTelegramLookup(new Request('https://example.com/api/telegram/lookup-webhook', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }
  }), { TELEGRAM_LOOKUP_WEBHOOK_SECRET: 'fixture' });
  assert.equal(response.status, 401);
});

test('lookup webhook accepts the standard Telegram secret header before processing', async () => {
  const response = await handleTelegramLookup(new Request('https://example.com/api/telegram/lookup-webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'fixture'
    },
    body: JSON.stringify({})
  }), { TELEGRAM_LOOKUP_WEBHOOK_SECRET: 'fixture', DB: dbFor(null) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, ignored: true });
});


test('duplicate lookup delivery is read-only and does not mutate inventory', async () => {
  let writes = 0;
  const db = dbFor(null);
  const originalPrepare = db.prepare;
  db.prepare = function(sql) {
    assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|REPLACE)\b/i);
    writes += /\b(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql) ? 1 : 0;
    return originalPrepare.call(this, sql);
  };
  const makeRequest = () => new Request('https://example.com/api/telegram/lookup-webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'fixture'
    },
    body: JSON.stringify({ update_id: 42, message: { message_id: 7, chat: { id: 99 }, text: 'missing-car' } })
  });
  const env = { TELEGRAM_LOOKUP_WEBHOOK_SECRET: 'fixture', TELEGRAM_LOOKUP_BOT_TOKEN: 'fixture', DB: db };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, result: {} }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    assert.equal((await handleTelegramLookup(makeRequest(), env)).status, 200);
    assert.equal((await handleTelegramLookup(makeRequest(), env)).status, 200);
    assert.equal(writes, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
