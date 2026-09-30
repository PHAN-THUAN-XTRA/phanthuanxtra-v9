import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const deploy = fs.readFileSync(new URL('../scripts/deploy-cloudflare-api.mjs', import.meta.url), 'utf8');

test('deploy controller verifies canonical tg-527 price and ODO after migrations', () => {
  assert.match(deploy, /await applyMigrations\(\);\s*await verifyTg527ProductionValues\(\);/);
  assert.match(deploy, /SELECT id, mileage, price FROM cars WHERE id = \?/);
  assert.match(deploy, /\["tg-527"\]/);
  assert.match(deploy, /Number\(row\.mileage\) !== 12000/);
  assert.match(deploy, /Number\(row\.price\) !== 4580000000/);
});

test('deploy controller fails closed for missing or incorrect tg-527 production values', () => {
  assert.match(deploy, /if \(!row \|\| Number\(row\.mileage\) !== 12000 \|\| Number\(row\.price\) !== 4580000000\)/);
  assert.match(deploy, /throw new Error\(\`D1 tg-527 verification failed:/);
  assert.match(deploy, /D1: verified tg-527 mileage=12000 price=4580000000/);
});
