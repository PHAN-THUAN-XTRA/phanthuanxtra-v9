import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Founder portrait is a high-quality office portrait asset', async () => {
  const image = await readFile(new URL('../public/images/phan-thuan-founder-office-2026.jpg', import.meta.url));
  assert.ok(image.length > 100_000, 'Founder portrait must contain non-trivial image data');
  assert.equal(image[0], 0xff);
  assert.equal(image[1], 0xd8);
});
