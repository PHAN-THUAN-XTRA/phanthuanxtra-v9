import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSource } from '../src/vip-telegram.js';

test('VIP saveSource claims a Telegram message exactly once', async () => {
  const keys = new Set();
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                if (sql.includes('INSERT OR IGNORE INTO vip_vehicle_sources')) {
                  const key = args[5];
                  if (key && keys.has(key)) return { meta: { changes: 0 } };
                  if (key) keys.add(key);
                  return { meta: { changes: 1 } };
                }
                return { meta: { changes: 0 } };
              }
            };
          }
        };
      }
    }
  };
  const session = { id: 7 };
  const source = { type: 'text', confidence: 0.9, claims: { vin: 'W1N12345678901234' } };
  assert.equal(await saveSource(env, session, 'text', null, 'VIN W1N12345678901234', source, '12345:678'), true);
  assert.equal(await saveSource(env, session, 'text', null, 'VIN W1N12345678901234', source, '12345:678'), false);
  assert.equal(keys.size, 1);
});
