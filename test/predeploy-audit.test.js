import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('pre-deploy audit contains blocking security and regression rules', async () => {
  const source = await readFile(new URL('../scripts/predeploy-audit.mjs', import.meta.url), 'utf8');
  for (const required of ['BLOCKER','HIGH','D1','Workers AI','Telegram','DEPLOY LOCKED']) assert.ok(source.includes(required), required);
  assert.match(source, /Behavior-changing files changed without targeted regression test changes/);
});
