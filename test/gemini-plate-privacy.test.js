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
      assert.equal(error.reason,'simulated images failure');
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


test('preparePrivateCover uses supported Images output options during normalize', async () => {
  let outputOptions;
  const env = {
    IMAGES: {
      input() {
        return {
          transform() { return this; },
          output(options) {
            outputOptions=options;
            throw new TypeError('stop after capturing output contract');
          }
        };
      }
    }
  };
  await assert.rejects(preparePrivateCover(env,new Uint8Array([1])),ImagePrivacyError);
  assert.deepEqual(outputOptions,{format:'image/webp',quality:85});
  assert.equal(Object.hasOwn(outputOptions,'metadata'),false);
});


test('image privacy diagnostic reason redacts credential-like tokens and URLs', async () => {
  const env={IMAGES:{input(){throw new Error('failed https://example.invalid/path token_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890');}}};
  await assert.rejects(preparePrivateCover(env,new Uint8Array([1])),error=>{
    assert.ok(error instanceof ImagePrivacyError);
    assert.equal(error.stage,'normalize');
    assert.doesNotMatch(error.reason,/https:\/\//);
    assert.doesNotMatch(error.reason,/ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
    assert.match(error.reason,/\[url\]|redacted/);
    assert.ok(error.reason.length<=180);
    return true;
  });
});
