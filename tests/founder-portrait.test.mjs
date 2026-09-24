import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Founder portrait is a high-quality office portrait asset', async () => {
  const image = await readFile(new URL('../public/images/phan-thuan-founder-office-2026.webp', import.meta.url));
  assert.ok(image.length > 10_000, 'Founder portrait must contain non-trivial image data');
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
});


test('legacy Founder JPEG has been removed after WebP replacement', async () => {
  await assert.rejects(
    readFile(new URL('../public/images/phan-thuan-founder-office-2026.jpg', import.meta.url)),
    error => error?.code === 'ENOENT'
  );
});
