import test from 'node:test';
import assert from 'node:assert/strict';
import { lookup, formatCar, handleTelegramLookup } from '../src/telegram-lookup.js';

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
  }), { TELEGRAM_LOOKUP_WEBHOOK_SECRET: 'expected' });
  assert.equal(response.status, 401);
});

test('lookup webhook accepts the standard Telegram secret header before processing', async () => {
  const response = await handleTelegramLookup(new Request('https://example.com/api/telegram/lookup-webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'expected'
    },
    body: JSON.stringify({})
  }), { TELEGRAM_LOOKUP_WEBHOOK_SECRET: 'expected', DB: dbFor(null) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, ignored: true });
});
