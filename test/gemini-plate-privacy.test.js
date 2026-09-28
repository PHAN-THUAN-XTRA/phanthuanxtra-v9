import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePrivateCover, ImagePrivacyError } from '../src/gemini-plate-privacy.js';

test('preparePrivateCover fails closed with normalize stage when Images input throws', async () => {
  const env = {
    IMAGES: { input() { throw new TypeError('simulated images failure'); } }
  };
  await assert.rejects(
    preparePrivateCover(env, new Uint8Array([1,2,3])),
    error => {
      assert.ok(error instanceof ImagePrivacyError);
      assert.equal(error.status, 422);
      assert.equal(error.stage, 'normalize');
      assert.match(error.message, /normalize/);
      assert.doesNotMatch(error.message, /simulated images failure/);
      return true;
    }
  );
});

test('preparePrivateCover rejects missing Images binding without persisting source', async () => {
  await assert.rejects(
    preparePrivateCover({}, new Uint8Array([1])),
    error => error instanceof ImagePrivacyError && error.status === 422
  );
});
