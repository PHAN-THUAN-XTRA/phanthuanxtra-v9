import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Founder portrait is a valid optimized WebP asset', async () => {
  const image = await readFile(new URL('../public/images/founder-phan-thuan.webp', import.meta.url));
  assert.ok(image.length > 4_096, 'Founder portrait must contain non-trivial image data');
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
});
