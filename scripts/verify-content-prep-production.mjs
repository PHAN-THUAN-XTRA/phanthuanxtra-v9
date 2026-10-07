import assert from 'node:assert/strict';
import { publicationKey } from '../src/editorial-publishing.js';

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
  const REVIEW = ADMIN + '/review', draftKey = await publicationKey(JSON.stringify([pipeline, draftId])), proposalKey = await publicationKey(JSON.stringify([pipeline, scheduleId]));
  expect(await call(REVIEW, writer), 401, 'Scoped writer cannot access owner review');
  expect(await call('/api/telegram/mini/v1/content-review'), 401, 'Mini App review requires signed session');
  const ownerList = expect(await call(REVIEW + '?pipeline_id=' + pipeline, owner), 200, 'Owner review list');
  assert.equal(ownerList.drafts.length, 1); assert.equal(ownerList.live_enabled, false);
  assert.equal(ownerList.drafts[0].latest_proposal.stale, false);
  const decision = { request_id: 'owner-check-' + crypto.randomUUID(), expected_revision: draft.draft_revision, decision: 'accepted' };
  const accepted = expect(await call(REVIEW + '/requests/' + proposalKey + '/decision', owner, decision), 200, 'Owner records schedule review');
  assert.equal(accepted.review_only, true); assert.equal(accepted.publicPublish, false); assert.equal(accepted.duplicate, false);
  assert.equal(expect(await call(REVIEW + '/requests/' + proposalKey + '/decision', owner, decision), 200, 'Decision replay').duplicate, true);
  const edit = { request_id: 'owner-edit-' + crypto.randomUUID(), expected_revision: draft.draft_revision,
    title: 'CI — Nháp đã được owner kiểm tra', content: 'Nội dung tiếng Việt đã sửa, vẫn riêng tư.', excerpt: '', category: 'Tin tức', tags: ['ci', 'private-fixture'] };
  const edited = expect(await call(REVIEW + '/drafts/' + draftKey, owner, edit, 'PATCH'), 200, 'Owner private edit');
  assert.notEqual(edited.draft_revision, draft.draft_revision);
  expect(await call(REVIEW + '/drafts/' + draftKey, owner, edit, 'PATCH'), 200, 'Edit replay');
  expect(await call(REVIEW + '/drafts/' + draftKey, owner, { ...edit, title: 'Changed payload' }, 'PATCH'), 409, 'Edit request conflict');
  const detail = expect(await call(REVIEW + '/drafts/' + draftKey, owner), 200, 'Current owner detail');
  assert.equal(detail.draft.post.content, edit.content); assert.equal(detail.draft.post.status, 'draft'); assert.equal(detail.draft.post.url, null);
  assert.equal(detail.proposals[0].stale, true); assert.equal(detail.proposals[0].review, null); assert.equal(detail.history.length, 2);
  expect(await call(REVIEW + '/requests/' + proposalKey + '/decision', owner, { ...decision, request_id: 'stale-' + crypto.randomUUID(), expected_revision: edited.draft_revision }), 409, 'Stale proposal cannot be reviewed');
  expect(await call(REVIEW + '/drafts/' + draftKey, owner, { ...edit, request_id: 'stale-edit-' + crypto.randomUUID() }, 'PATCH'), 409, 'Concurrent revision denied');
  const dismissed = expect(await call(REVIEW + '/requests/' + draftKey + '/decision', owner, {
    request_id: 'owner-dismiss-' + crypto.randomUUID(), expected_revision: edited.draft_revision, decision: 'dismissed'
  }), 200, 'Owner dismisses private draft');
  assert.equal(dismissed.autoPublish, false);
  for (const [path, marker] of [['/admin-control.html', 'ownerContentReview'], ['/telegram-mini-app.html', 'contentTab'], ['/content-review.js?v=20261003-1', 'PTXContentReview'], ['/content-review.css?v=20261003-1', 'content-review']]) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(25000) });
    assert.equal(response.status, 200, 'Review asset delivered'); assert.ok((await response.text()).includes(marker), 'Review asset current');
  }
  console.log('OWNER CONTENT REVIEW PRODUCTION: owner-only list/detail; UTF-8 private edit; decision/replay/audit; stale/concurrent rejection; Admin/Mini App assets; no public publish: PASS');
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
