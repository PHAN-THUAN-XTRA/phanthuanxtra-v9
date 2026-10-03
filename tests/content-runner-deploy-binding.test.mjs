import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withContentRunnerBinding } from '../scripts/content-runner-deploy-binding.mjs';

test('API deployment explicitly disables live runner instead of inheriting a prior enablement', () => {
  const config = JSON.parse(fs.readFileSync('wrangler.json', 'utf8'));
  const inherited = [{ name: 'CONTENT_RUNNER_LIVE_ENABLED', type: 'inherit', version_id: 'latest' }, { name: 'DB', type: 'inherit', version_id: 'latest' }];
  const result = withContentRunnerBinding(inherited, config);
  assert.deepEqual(result, [inherited[1], { name: 'CONTENT_RUNNER_LIVE_ENABLED', type: 'plain_text', text: '0' }]);
  for (const value of [undefined, true, 'true', 1]) assert.throws(() => withContentRunnerBinding([], { vars: { CONTENT_RUNNER_LIVE_ENABLED: value } }));
});
