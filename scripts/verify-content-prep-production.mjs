import assert from 'node:assert/strict';

const base = 'https://phanthuanxtra.com';
const API = '/api/agents/content/v1', ADMIN = '/api/admin/agents/content-prep';
const pipeline = 'ci-content-' + crypto.randomUUID();
const draftId = 'draft-' + crypto.randomUUID(), scheduleId = 'schedule-' + crypto.randomUUID();
let owner, writer, scheduler, postId;
async function call(path, token, body, method = body ? 'POST' : 'GET', extraHeaders = {}) {
  const response = await fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(25000),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extraHeaders },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  let value;
  try { value = await response.json(); } catch { value = null; }
  return { status: response.status, value };
}
const expect = (r, status, label) => { assert.equal(r.status, status, `${label}: HTTP ${r.status}`); return r.value; };

try {
  assert.ok(process.env.ADMIN_PASSWORD, 'ADMIN_PASSWORD is required');
  owner = expect(await call('/api/admin/login', null, { password: process.env.ADMIN_PASSWORD }), 200, 'Owner login').token;
  writer = expect(await call(ADMIN + '/credentials', owner, { agent_id: 'agent-11', pipeline_id: pipeline }), 201, 'Writer credential').token;
  scheduler = expect(await call(ADMIN + '/credentials', owner, { agent_id: 'agent-19', pipeline_id: pipeline }), 201, 'Scheduler credential').token;
  assert.equal(expect(await call(API + '/contract', writer), 200, 'Execution contract').publicPublish, false);
  const runnerHeaders = { 'x-content-scheduler-credential': 'Bearer ' + scheduler };
  const runnerBrief = { request_id: 'runner-' + crypto.randomUUID(), source: 'Nguồn tiếng Việt dùng riêng để kiểm chứng preview.', schedule: new Date(Date.now() + 86400000 + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ') };
  const preview = expect(await call(API + '/runs/preview', writer, runnerBrief, 'POST', runnerHeaders), 200, 'Runner preview');
  assert.equal(preview.preview_only, true); assert.equal(preview.persisted, false); assert.equal(preview.model_calls, 0); assert.equal(preview.publicPublish, false);
  assert.equal(preview.article.content, runnerBrief.source);
  assert.equal(expect(await call(API + '/runs', writer, runnerBrief, 'POST', runnerHeaders), 503, 'Live runner remains off').error, 'LIVE_RUNNER_DISABLED');
  expect(await call(API + '/runs/' + runnerBrief.request_id, writer, undefined, 'GET', runnerHeaders), 404, 'Preview leaves no run ledger');
  expect(await call(API + '/runs/preview', writer, runnerBrief), 401, 'Runner requires both scopes');
  console.log('CONTENT RUNNER PRODUCTION: deterministic UTF-8 preview; zero model calls/artifacts; live runner disabled; dual scope required: PASS');
  const content = { request_id: draftId, title: 'CI — Nội dung nháp riêng tư', content: 'Kiểm chứng atomic agent: chỉ chuẩn bị nội dung và lịch đề xuất.', tags: ['ci', 'private-fixture'] };
  const draft = expect(await call(API + '/drafts', writer, content), 201, 'Private draft');
  postId = draft.post_id;
  assert.ok(postId);
  assert.equal(draft.post.status, 'draft');
  assert.equal(draft.post.url, null);
  assert.equal(draft.post.content, content.content);
  assert.equal(expect(await call(API + '/drafts', writer, content), 200, 'Idempotent draft replay').post_id, postId);
  expect(await call(API + '/drafts', writer, { ...content, content: 'Changed payload' }), 409, 'Fingerprint conflict');
  const schedule = new Date(Date.now() + 86400000 + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
  const proposal = { request_id: scheduleId, post_id: postId, draft_revision: draft.draft_revision, schedule };
  const saved = expect(await call(API + '/schedule-proposals', scheduler, proposal), 201, 'Schedule proposal');
  assert.equal(saved.proposal.state, 'proposed');
  assert.equal(saved.autoPublish, false);
  assert.equal(saved.post.status, 'draft');
  assert.equal(expect(await call(API + '/schedule-proposals', scheduler, proposal), 200, 'Proposal replay').duplicate, true);
  expect(await call(API + '/schedule-proposals', writer, proposal), 403, 'Writer cannot schedule');
  expect(await call(API + '/drafts', scheduler, content), 403, 'Scheduler cannot create drafts');
  expect(await call(ADMIN + '/credentials', writer, { agent_id: 'agent-20', pipeline_id: pipeline }), 401, 'Credential escalation denied');
  for (const token of [writer, scheduler]) {
    expect(await call('/api/publish/v1/posts/' + postId + '/publish', token, {}), 401, 'Public publish denied');
    expect(await call('/api/admin/posts/' + postId, token, { status: 'published' }, 'PUT'), 401, 'Administrative publish denied');
    expect(await call('/api/cms/v1/posts/' + postId, token, { status: 'published' }, 'PUT'), 401, 'CMS publish denied');
  }
  const other = expect(await call(ADMIN + '/credentials', owner, { agent_id: 'agent-19', pipeline_id: 'other-' + crypto.randomUUID() }), 201, 'Other pipeline credential').token;
  expect(await call(API + '/drafts/' + postId, other), 404, 'Pipeline isolation');
  expect(await call('/blog/' + draft.post.slug), 404, 'Private page');
  expect(await call('/api/blog/posts/' + draft.post.slug), 404, 'Private public API');
  assert.equal(expect(await call(API + '/requests/' + draftId, writer), 200, 'Draft reconciliation').post_id, postId);
  assert.equal(expect(await call(API + '/requests/' + scheduleId, scheduler), 200, 'Proposal reconciliation').post_id, postId);
  const review = expect(await call(ADMIN + '?pipeline_id=' + pipeline, owner), 200, 'Owner evidence');
  assert.equal(review.requests.length, 2);
  assert.ok(review.requests.every(r => r.status === 'completed'));
  console.log('ATOMIC CONTENT PREP PRODUCTION: private UTF-8 draft + proposal + idempotency/conflict + reconciliation + action/pipeline isolation + public publish denied: PASS');
} finally {
  // Reconcile a response lost after commit before cleaning only this test's private draft.
  if (!postId && writer) {
    const replay = await call(API + '/requests/' + draftId, writer);
    assert.ok([200, 404].includes(replay.status), 'Cleanup reconciliation failed');
    postId = replay.value?.post_id;
  }
  if (postId) {
    expect(await call('/api/admin/posts/' + postId, owner, undefined, 'DELETE'), 200, 'Private fixture cleanup');
    assert.equal(expect(await call(API + '/requests/' + draftId, writer), 200, 'Cleanup reconciliation').artifact_available, false);
    console.log('ATOMIC CONTENT PREP temporary private draft cleanup: PASS; audit ledger retained.');
  }
}
