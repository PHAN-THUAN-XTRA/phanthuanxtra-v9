import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('pre-deploy audit contains blocking security and regression rules', async () => {
  const source = await readFile(new URL('../scripts/predeploy-audit.mjs', import.meta.url), 'utf8');
  for (const required of ['BLOCKER','HIGH','D1','Workers AI','Telegram','DEPLOY LOCKED']) assert.ok(source.includes(required), required);
  assert.match(source, /Behavior-changing files changed without targeted regression test changes/);
});

test('production publishing verifier enforces draft privacy without weakening authenticated variants', async () => {
  const source = await readFile(new URL('../scripts/verify-publishing-production.mjs', import.meta.url), 'utf8');
  assert.match(source, /\[401,403,404\]\.includes\(response\.status\)/);
  assert.match(source, /await denyDraft\(media\.url,'Canonical'\)/);
  assert.match(source, /await denyDraft\(media\.url\+'\?format=webp','WebP variant'\)/);
  assert.match(source, /await denyDraft\(media\.url\+'\?format=avif','AVIF variant'\)/);
  assert.match(source, /const canonical=await request\(media\.url/);
  assert.match(source, /assert\.equal\(canonical\.status,200\)/);
  assert.match(source, /const webp=await request\(media\.url\+'\?format=webp'/);
  assert.match(source, /assert\.equal\(webp\.status,200\)/);
  assert.match(source, /const avif=await request\(media\.url\+'\?format=avif'/);
  assert.match(source, /assert\.equal\(avif\.status,200\)/);
  assert.match(source, /Draft must stay private/);
  assert.match(source, /page\.status,200/);
});
