import { verifyContentPrepToken } from './content-prep-auth.js';
import { boundedBytes } from './publishing-api.js';
import { CONTENT_RUNNER_PATH as PATH, contentRunnerContract } from './content-runner-contract.js';
import { RunnerError, validateBrief, previewBrief, advanceRun, inspectRun } from './content-runner.js';
import { handleContentPrepApi } from './content-prep-api.js';
import { runKey } from './content-runner.js';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
async function currentResult(view, request, env) {
  if (view?.status !== 'completed') return view;
  const key = await runKey(view.pipeline_id, view.request_id);
  const response = await handleContentPrepApi(new Request('https://phanthuanxtra.com/api/agents/content/v1/requests/run-' + key + '-schedule', {
    headers: { authorization: request.headers.get('authorization') }
  }), env);
  if (!response.ok) throw new RunnerError('RECONCILIATION_UNAVAILABLE', response.status);
  // Completion is historical; artifact availability/revision/time is current.
  return { ...view, result: await response.json() };
}
export async function handleContentRunnerApi(request, env, options = {}) {
  const path = new URL(request.url).pathname;
  if (path !== PATH && !path.startsWith(PATH + '/')) return null;
  try {
    const writer = await verifyContentPrepToken(request, env, options.now);
    const schedulerHeader = request.headers.get('x-content-scheduler-credential') || '';
    const scheduler = await verifyContentPrepToken(new Request(request.url, { headers: { authorization: schedulerHeader } }), env, options.now);
    if (!writer || !scheduler) return json({ error: 'Unauthorized' }, 401);
    if (writer.action !== 'create-draft' || scheduler.action !== 'prepare-schedule' || writer.pipeline_id !== scheduler.pipeline_id) return json({ error: 'RUNNER_SCOPE_DENIED', publicPublish: false }, 403);
    if (env.AI_AGENT_FLEET_ENABLED === '0') return json({ error: 'FLEET_DISABLED' }, 503);
    if (path === PATH + '/contract' && request.method === 'GET') return json(contentRunnerContract());
    const id = path.slice(PATH.length + 1);
    if (request.method === 'GET' && /^[A-Za-z0-9_-]{16,100}$/.test(id)) {
      if (!env.DB) return json({ error: 'D1_UNAVAILABLE' }, 503);
      const view = await inspectRun(env.DB.withSession?.('first-primary') || env.DB, writer.pipeline_id, id, options.now);
      return view ? json(await currentResult(view, request, env)) : json({ error: 'Not Found' }, 404);
    }
    if (request.method !== 'POST' || (path !== PATH && path !== PATH + '/preview')) return json({ error: 'RUNNER_ACTION_DENIED', publicPublish: false }, 403);
    if (path === PATH && env.CONTENT_RUNNER_LIVE_ENABLED !== '1') return json({ error: 'LIVE_RUNNER_DISABLED', contract: contentRunnerContract() }, 503);
    if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new RunnerError('JSON_REQUIRED', 415);
    let body;
    try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 64 * 1024))); } catch { throw new RunnerError('JSON_INVALID'); }
    const brief = validateBrief(body);
    if (path.endsWith('/preview')) return json(previewBrief(brief));
    if (!env.DB) return json({ error: 'D1_UNAVAILABLE' }, 503);
    const view = await advanceRun(env, env.DB.withSession?.('first-primary') || env.DB, writer.pipeline_id, brief,
      { writer: request.headers.get('authorization'), scheduler: schedulerHeader }, options);
    return json(await currentResult(view, request, env), view.status === 'completed' ? 200 : view.status === 'blocked' ? 409 : 202);
  } catch (error) {
    return json({ error: error instanceof RunnerError ? error.message : 'RUNNER_UNAVAILABLE', publicPublish: false }, error instanceof RunnerError ? error.status : 503);
  }
}
