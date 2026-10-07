import { contentRunnerContract } from './content-runner-contract.js';
export const CONTENT_PREP_BASE = '/api/agents/content/v1';
export const CONTENT_PREP_ADMIN = '/api/admin/agents/content-prep';
export const CONTENT_PREP_VERSION = '1.0.0';
export const CONTENT_PREP_ACTIONS = Object.freeze({
  'agent-11': 'create-draft',
  'agent-19': 'prepare-schedule'
});
export const ATOMIC_CONTENT_AGENTS = Object.fromEntries(Object.entries(CONTENT_PREP_ACTIONS).map(([id, action]) => [id, {
  status: 'executing', atomic: true, contract: `content-prep/${CONTENT_PREP_VERSION}`,
  workflow: action, endpoint: `${CONTENT_PREP_BASE}/${action === 'create-draft' ? 'drafts' : 'schedule-proposals'}`,
  authBoundary: 'owner-issued, action + pipeline scoped ptxprep1 credential; expires within one hour',
  idempotency: 'xtra_content_prep_requests primary key + SHA-256 normalized payload fingerprint; one D1 transaction',
  audit: 'durable request ledger + cms_audit_log committed with the artifact',
  retry: 'same request_id returns canonical result; GET requests/{request_id} reconciles lost responses',
  permission: action === 'create-draft' ? 'create private drafts only within credential pipeline' : 'create schedule proposals for unchanged private drafts within credential pipeline',
  publicPublish: false
}]));

export function contentPrepContract() {
  return {
    version: CONTENT_PREP_VERSION, atomicAgents: ATOMIC_CONTENT_AGENTS, runner: contentRunnerContract(),
    credentialEndpoint: `${CONTENT_PREP_ADMIN}/credentials`, ownerReviewEndpoint: CONTENT_PREP_ADMIN,
    reconciliationEndpoint: `${CONTENT_PREP_BASE}/requests/{request_id}`,
    timezone: 'Asia/Ho_Chi_Minh', scheduleFormat: 'YYYY-MM-DD HH:mm',
    scheduleState: 'proposed', publicPublish: false, autoPublish: false,
    policy: 'Preparing a schedule never creates an editorial pending job. Public publish and approval remain separate owner workflows.'
  };
}
