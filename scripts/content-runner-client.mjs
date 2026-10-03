import { CONTENT_RUNNER_PATH } from '../src/content-runner-contract.js';

// The driver sends only delegated credentials to the canonical origin, never owner credentials.
export async function runContentBrief(brief, { writer, scheduler, transport = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), maxRounds = 12, preview = false }) {
  const url = 'https://phanthuanxtra.com' + CONTENT_RUNNER_PATH;
  const headers = { authorization: 'Bearer ' + writer, 'x-content-scheduler-credential': 'Bearer ' + scheduler, 'content-type': 'application/json' };
  for (let round = 0; round < Math.min(maxRounds, 12); round++) {
    let response;
    try {
      response = await transport(new Request(url + (preview ? '/preview' : ''), { method: 'POST', headers, body: JSON.stringify(brief), redirect: 'error', signal: AbortSignal.timeout(30000) }));
    } catch {
      // Read durable status after a lost response, then resume the same request.
      try { response = await transport(new Request(url + '/' + brief.request_id, { headers, redirect: 'error', signal: AbortSignal.timeout(30000) })); } catch { /* bounded retry below */ }
    }
    if (!response) { await wait(2000); continue; }
    const value = await response.json();
    if (response.status === 401) throw new Error('CREDENTIAL_RENEWAL_REQUIRED: resume the same request_id after owner renews both scopes');
    if (preview && response.ok) return value;
    if (value.status === 'completed') {
      if (!value.result?.artifact_available || value.result.post?.status !== 'draft' || value.result.proposal?.state !== 'proposed' || value.result.proposal?.stale) throw new Error('COMPLETED_ARTIFACT_STALE: owner review required');
      return value;
    }
    if (value.status === 'blocked' || ![200, 202, 503].includes(response.status) || value.error === 'LIVE_RUNNER_DISABLED') throw new Error(value.error_code || value.error || 'RUNNER_BLOCKED');
    const delay = Number(value.retry_after_ms) || 0;
    if (delay > 120000) throw new Error('RETRY_WINDOW_EXCEEDED');
    if (delay > 0 || response.status === 503) await wait(delay || 2000);
  }
  throw new Error('RESUME_REQUIRED: round limit reached; keep the same request_id');
}
