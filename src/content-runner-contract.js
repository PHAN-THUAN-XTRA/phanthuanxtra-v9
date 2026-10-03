export const CONTENT_RUNNER_PATH = '/api/agents/content/v1/runs';
export const CONTENT_RUNNER_LIMITS = Object.freeze({ callsPerRun: 3, callsPerDay: 12, attemptsPerStage: 3, maxTokens: 1200, timeoutMs: 25000, leaseMs: 120000 });
export function contentRunnerContract() {
  return {
    version: 'content-runner/1.0.0', endpoint: CONTENT_RUNNER_PATH,
    previewEndpoint: CONTENT_RUNNER_PATH + '/preview',
    reconciliationEndpoint: CONTENT_RUNNER_PATH + '/{request_id}',
    authorization: 'agent-11 Bearer plus X-Content-Scheduler-Credential containing agent-19 Bearer; same pipeline',
    trigger: 'authenticated brief; one checkpoint per POST; client resumes with the same request_id',
    liveDefault: 'disabled; requires CONTENT_RUNNER_LIVE_ENABLED=1 and fleet enabled',
    preview: 'deterministic source-only preview; no model call, draft, proposal or ledger write',
    limits: CONTENT_RUNNER_LIMITS, publicPublish: false, autoPublish: false, requires_owner_approval: true
  };
}
