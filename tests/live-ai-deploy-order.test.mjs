import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production AI E2E starts only after successful main push deploy', async () => {
  const workflow = await readFile(new URL('../.github/workflows/live-chat-ai-identity-verify.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_run:\s*\n\s*workflows: \["Deploy Cloudflare Worker"\]/);
  assert.match(workflow, /types: \[completed\]/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /workflow_run\.event == 'push' && github\.event\.workflow_run\.conclusion == 'success'/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.match(workflow, /Verif(?:y|ying) full-site AI advisory on production/);
});
