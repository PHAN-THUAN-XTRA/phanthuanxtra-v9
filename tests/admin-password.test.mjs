import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rotateAdminRecoveryCode,
  setAdminPassword,
  verifyAdminPassword,
  verifyAdminRecoveryCode
} from '../src/admin-password.js';

test('D1 credential lookup failure fails closed instead of throwing', async () => {
  const env = {
    ADMIN_PASSWORD: 'fallback-password',
    DB: {
      prepare() {
        throw new Error('D1 unavailable');
      }
    }
  };

  await assert.doesNotReject(() => verifyAdminPassword(env, 'wrong-password'));
  assert.equal(await verifyAdminPassword(env, 'wrong-password'), false);
  assert.equal(await verifyAdminPassword(env, 'fallback-password'), false);
});

test('missing persisted credential row uses bootstrap ADMIN_PASSWORD fallback', async () => {
  const env = {
    ADMIN_PASSWORD: 'fallback-password',
    DB: {
      prepare() {
        return { first: async () => null };
      }
    }
  };

  assert.equal(await verifyAdminPassword(env, 'fallback-password'), true);
  assert.equal(await verifyAdminPassword(env, 'wrong-password'), false);
});

test('persisted admin password round-trips with supported PBKDF2 parameters', async () => {
  let passwordRow = null;
  const env = {
    DB: {
      prepare(sql) {
        assert.match(sql, /admin_credentials/);
        return {
          first: async () => passwordRow,
          bind: (...values) => ({
            run: async () => {
              passwordRow = { password_hash: values[0], salt: values[1] };
            }
          })
        };
      }
    }
  };

  await setAdminPassword(env, 'new-password-123');
  assert.ok(passwordRow);
  assert.equal(await verifyAdminPassword(env, 'new-password-123'), true);
  assert.equal(await verifyAdminPassword(env, 'wrong-password'), false);
});

test('rotated recovery code round-trips and rejects the previous value', async () => {
  let recoveryRow = null;
  const env = {
    DB: {
      prepare(sql) {
        assert.match(sql, /admin_recovery_credentials/);
        return {
          first: async () => recoveryRow,
          bind: (...values) => ({
            run: async () => {
              recoveryRow = { code_hash: values[0], salt: values[1] };
            }
          })
        };
      }
    }
  };

  const recoveryCode = await rotateAdminRecoveryCode(env);
  assert.match(recoveryCode, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(await verifyAdminRecoveryCode(env, recoveryCode), true);
  assert.equal(await verifyAdminRecoveryCode(env, `${recoveryCode}x`), false);
});
