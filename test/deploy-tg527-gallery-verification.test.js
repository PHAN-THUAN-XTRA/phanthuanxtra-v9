import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const deploy = fs.readFileSync(new URL('../scripts/deploy-cloudflare-api.mjs', import.meta.url), 'utf8');

test('deploy controller verifies tg-527 production gallery after migrations', () => {
  assert.match(deploy, /await applyMigrations\(\);\s*await verifyTg527ProductionValues\(\);\s*await verifyTg527ProductionGallery\(\);/);
  assert.match(deploy, /SELECT id,url,sort_order,is_cover FROM car_images WHERE car_id = \? ORDER BY sort_order,id/);
  assert.match(deploy, /rows\.length !== 24/);
  assert.match(deploy, /Number\(row\?\.sort_order\) !== i/);
  assert.match(deploy, /url\.includes\("%2F"\)/);
  assert.match(deploy, /duplicate URL/);
  assert.match(deploy, /Number\(row\?\.is_cover\) !== \(i === 0 \? 1 : 0\)/);
  assert.match(deploy, /SELECT cover_image FROM cars WHERE id = \?/);
});

test('tg-527 gallery verification pins all 24 approved semantic image identities', () => {
  const matches = [...deploy.matchAll(/"telegram-\d+-[a-f0-9]+\.webp"/g)].map(x => x[0]);
  const unique = new Set(matches);
  assert.equal(unique.size, 24);
  assert.match(deploy, /"telegram-531-6fc5b1941350ce0d\.webp"/);
  assert.match(deploy, /verified tg-527 gallery 24\/24, sort_order=0\.\.23, canonical URLs, single semantic cover/);
});
