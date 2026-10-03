export function withContentRunnerBinding(bindings, config) {
  const value = config?.vars?.CONTENT_RUNNER_LIVE_ENABLED;
  if (!['0', '1'].includes(value)) throw new Error('CONTENT_RUNNER_LIVE_ENABLED must be explicitly 0 or 1 in deployment configuration');
  return [...bindings.filter(binding => binding.name !== 'CONTENT_RUNNER_LIVE_ENABLED'),
    { name: 'CONTENT_RUNNER_LIVE_ENABLED', type: 'plain_text', text: value }];
}
