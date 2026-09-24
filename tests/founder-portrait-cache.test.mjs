import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Founder page versions the immutable portrait asset', async () => {
  const html = await readFile(new URL('../public/phan-thuan.html', import.meta.url), 'utf8');
  assert.match(html, /src="\/images\/founder-phan-thuan\.webp\?v=4c2122f"/);
});
