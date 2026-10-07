import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { database } from '../tests/helpers/editorial-db.mjs';
import { issueAdminToken, verifyAdminToken } from '../src/admin-auth.js';
import { issueContentPrepToken, verifyContentPrepToken } from '../src/content-prep-auth.js';
import { handleContentPrepApi, draftRevision } from '../src/content-prep-api.js';
import { publishDueArticles, submitArticles } from '../src/editorial-publishing.js';
import { getPost } from '../src/post-persistence.js';
import worker from '../src/entry.js';

const BASE = '/api/agents/content/v1';
const ADMIN = '/api/admin/agents/content-prep';
const PIPELINE = 'content-pipeline-001';
const DRAFT = { request_id: 'content-draft-00001', title: 'Bản nháp tiếng Việt', content: 'Nội dung chuẩn bị cho chủ sở hữu kiểm tra.', tags: ['ô tô'] };
const futureSchedule = () => new Date(Date.now() + 86400000 + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
function request(path, token, body, method = body ? 'POST' : 'GET') {
  return new Request('https://phanthuanxtra.com' + path, { method, headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function fixture() {
  const db = database();
  const migration = fs.readFileSync(new URL('../migrations/0031_content_prep_contract.sql', import.meta.url), 'utf8');
  db.sqlite.exec(migration);
  db.sqlite.exec(migration); // Deployment retries must be safe.
  const env = { DB: db, ADMIN_PASSWORD: crypto.randomUUID(), CMS_API_KEY: crypto.randomUUID(), PUBLISH_API_KEY: crypto.randomUUID() };
  const writer = (await issueContentPrepToken(env, { agent_id: 'agent-11', pipeline_id: PIPELINE })).token;
  const scheduler = (await issueContentPrepToken(env, { agent_id: 'agent-19', pipeline_id: PIPELINE })).token;
  const admin = await issueAdminToken(env);
  const call = (path, token, body, method) => handleContentPrepApi(request(path, token, body, method), env);
  const countQueries = { posts: 'SELECT COUNT(*) n FROM posts', editorial_jobs: 'SELECT COUNT(*) n FROM editorial_jobs', cms_audit_log: 'SELECT COUNT(*) n FROM cms_audit_log', xtra_content_prep_requests: 'SELECT COUNT(*) n FROM xtra_content_prep_requests' };
  const count = table => db.sqlite.prepare(countQueries[table]).get().n;
  const draft = async () => (await call(BASE + '/drafts', writer, DRAFT)).json();
  return { db, env, writer, scheduler, admin, call, count, draft };
}

test('owner alone issues bounded action and pipeline credentials; credentials cannot mint credentials', async () => {
  const f = await fixture(), body = { agent_id: 'agent-11', pipeline_id: PIPELINE, ttl_seconds: 60 };
  for (const token of [null, f.writer, f.env.CMS_API_KEY, f.env.PUBLISH_API_KEY]) assert.equal((await f.call(ADMIN + '/credentials', token, body)).status, 401);
  const response = await f.call(ADMIN + '/credentials', f.admin, body);
  assert.equal(response.status, 201);
  const value = await response.json();
  assert.equal(value.publicPublish, false);
  assert.equal(value.action, 'create-draft');
  assert.equal((await verifyAdminToken(request('/', value.token), f.env)).ok, false);
  const audit = f.db.sqlite.prepare('SELECT * FROM cms_audit_log').all();
  assert.equal(audit.length, 1);
  assert.ok(!JSON.stringify(audit).includes(value.token));
  for (const b of [{ ...body, agent_id: 'agent-20' }, { ...body, ttl_seconds: 3601 }, { ...body, action: 'publish' }]) assert.equal((await f.call(ADMIN + '/credentials', f.admin, b)).status, 400);
});

test('expired, tampered and non-Bearer credentials fail closed', async () => {
  const f = await fixture();
  const old = (await issueContentPrepToken(f.env, { agent_id: 'agent-11', pipeline_id: PIPELINE, ttl_seconds: 60 }, Date.now() - 120000)).token;
  assert.equal(await verifyContentPrepToken(request('/', old), f.env), null);
  const [prefix, encoded, signature] = f.writer.split('.');
  const changed = JSON.parse(Buffer.from(encoded, 'base64url').toString());
  changed.action = 'prepare-schedule';
  const forged = `${prefix}.${Buffer.from(JSON.stringify(changed)).toString('base64url')}.${signature}`;
  assert.equal((await f.call(BASE + '/drafts', forged, DRAFT)).status, 401);
  assert.equal(await verifyContentPrepToken(new Request('https://test/', { headers: { authorization: f.writer } }), f.env), null);
});

test('draft, ledger and audit are atomic, private, replay-safe and reconciliable', async () => {
  const f = await fixture();
  const responses = await Promise.all(Array.from({ length: 6 }, () => f.call(BASE + '/drafts', f.writer, DRAFT)));
  assert.equal(responses.filter(r => r.status === 201).length, 1);
  assert.equal(responses.filter(r => r.status === 200).length, 5);
  const values = await Promise.all(responses.map(r => r.json()));
  assert.equal(new Set(values.map(v => v.post_id)).size, 1);
  assert.equal(f.count('posts'), 1);
  assert.equal(f.count('xtra_content_prep_requests'), 1);
  assert.equal(f.count('cms_audit_log'), 1);
  assert.equal(f.count('editorial_jobs'), 0);
  const saved = values[0];
  assert.equal(saved.post.status, 'draft');
  assert.equal(saved.post.title, DRAFT.title);
  assert.equal(saved.post.url, null);
  assert.equal(saved.draft_revision, await draftRevision(saved.post));
  assert.equal((await f.call(BASE + '/requests/' + DRAFT.request_id, f.writer)).status, 200);
  assert.equal((await worker.fetch(request('/blog/' + saved.post.slug), f.env)).status, 404);
  assert.equal((await worker.fetch(request('/api/blog/posts/' + saved.post_id), f.env)).status, 404);
});

test('same key with different content conflicts, including concurrent submissions', async () => {
  const f = await fixture();
  const responses = await Promise.all([f.call(BASE + '/drafts', f.writer, DRAFT), f.call(BASE + '/drafts', f.writer, { ...DRAFT, content: 'Nội dung khác' })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  assert.equal(f.count('posts'), 1);
  assert.equal(f.count('cms_audit_log'), 1);
});

test('failed audit rolls back claim and draft; retry succeeds without stranded ledger', async () => {
  const f = await fixture();
  f.db.sqlite.exec('DROP TABLE cms_audit_log');
  assert.equal((await f.call(BASE + '/drafts', f.writer, DRAFT)).status, 503);
  assert.equal(f.count('posts'), 0);
  assert.equal(f.count('xtra_content_prep_requests'), 0);
  f.db.sqlite.exec('CREATE TABLE cms_audit_log (actor TEXT, action TEXT, resource TEXT, resource_id TEXT, summary TEXT)');
  assert.equal((await f.call(BASE + '/drafts', f.writer, DRAFT)).status, 201);
});

test('lost response after commit reconciles and retries without another artifact', async () => {
  const f = await fixture(), batch = f.db.batch.bind(f.db);
  let interrupted = false;
  f.db.batch = async statements => { const writes = await batch(statements); if (!interrupted) { interrupted = true; throw new Error('simulated response loss'); } return writes; };
  assert.equal((await f.call(BASE + '/drafts', f.writer, DRAFT)).status, 503);
  assert.equal((await f.call(BASE + '/requests/' + DRAFT.request_id, f.writer)).status, 200);
  assert.equal((await f.call(BASE + '/drafts', f.writer, DRAFT)).status, 200);
  assert.equal(f.count('posts'), 1);
  assert.equal(f.count('cms_audit_log'), 1);
});

test('scheduler prepares a revision-bound proposal; cron cannot publish it even after due time', async () => {
  const f = await fixture(), draft = await f.draft();
  const body = { request_id: 'content-schedule-001', post_id: draft.post_id, draft_revision: draft.draft_revision, schedule: futureSchedule() };
  const responses = await Promise.all(Array.from({ length: 4 }, () => f.call(BASE + '/schedule-proposals', f.scheduler, body)));
  assert.equal(responses.filter(r => r.status === 201).length, 1);
  assert.equal(responses.filter(r => r.status === 200).length, 3);
  const proposal = await responses[0].json();
  assert.equal(proposal.proposal.state, 'proposed');
  assert.equal(proposal.autoPublish, false);
  assert.equal(proposal.publicPublish, false);
  assert.equal(proposal.proposal.scheduled_at, new Date(body.schedule.replace(' ', 'T') + ':00+07:00').toISOString());
  assert.equal(f.count('editorial_jobs'), 0);
  assert.equal(f.count('cms_audit_log'), 2);
  assert.equal((await publishDueArticles(f.env, { now: Date.parse(proposal.proposal.scheduled_at) + 3600000 })).published, 0);
  assert.equal((await getPost(f.db, draft.post_id)).status, 'draft');
  assert.equal((await f.call(BASE + '/schedule-proposals', f.scheduler, { ...body, schedule: '2099-12-01 12:00' })).status, 409);
  assert.equal((await f.call(BASE + '/schedule-proposals', f.scheduler, { ...body, request_id: DRAFT.request_id })).status, 409);
});

test('proposal replay remains safe after due time and flags stale proposals', async () => {
  const f = await fixture(), draft = await f.draft();
  const body = { request_id: 'content-schedule-002', post_id: draft.post_id, draft_revision: draft.draft_revision, schedule: futureSchedule() };
  const originalNow = Date.now;
  try {
    assert.equal((await f.call(BASE + '/schedule-proposals', f.scheduler, body)).status, 201);
    Date.now = () => originalNow() + 86400000 * 2;
    // Re-issue a current credential for the same pipeline; old credentials expired.
    const renewed = (await issueContentPrepToken(f.env, { agent_id: 'agent-19', pipeline_id: PIPELINE })).token;
    const response = await f.call(BASE + '/schedule-proposals', renewed, body);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).proposal.stale, true);
    assert.equal(f.count('xtra_content_prep_requests'), 2);
  } finally { Date.now = originalNow; }
});

test('action scope and pipeline ownership prevent cross-agent and cross-pipeline writes or reads', async () => {
  const f = await fixture(), draft = await f.draft();
  const schedule = { request_id: 'content-schedule-003', post_id: draft.post_id, draft_revision: draft.draft_revision, schedule: futureSchedule() };
  const other = (await issueContentPrepToken(f.env, { agent_id: 'agent-19', pipeline_id: 'content-pipeline-002' })).token;
  assert.equal((await f.call(BASE + '/drafts', f.scheduler, DRAFT)).status, 403);
  assert.equal((await f.call(BASE + '/schedule-proposals', f.writer, schedule)).status, 403);
  assert.equal((await f.call(BASE + '/drafts/' + draft.post_id, other)).status, 404);
  assert.equal((await f.call(BASE + '/requests/' + DRAFT.request_id, other)).status, 404);
  assert.equal((await f.call(BASE + '/schedule-proposals', other, schedule)).status, 404);
  assert.equal((await f.call(ADMIN + '?pipeline_id=' + PIPELINE, f.scheduler)).status, 401);
  assert.equal((await f.call(ADMIN + '?pipeline_id=' + PIPELINE, f.admin)).status, 200);
});

test('published, modified and concurrently edited drafts cannot create new schedule proposals', async () => {
  const f = await fixture(), draft = await f.draft();
  const body = { request_id: 'content-schedule-004', post_id: draft.post_id, draft_revision: draft.draft_revision, schedule: futureSchedule() };
  const batch = f.db.batch.bind(f.db);
  f.db.batch = async statements => { f.db.sqlite.prepare("UPDATE posts SET content='Owner edit' WHERE id=?").run(draft.post_id); return batch(statements); };
  assert.equal((await f.call(BASE + '/schedule-proposals', f.scheduler, body)).status, 409);
  assert.equal(f.count('xtra_content_prep_requests'), 1);
  assert.equal(f.count('cms_audit_log'), 1);
  f.db.batch = batch;
  assert.equal((await f.call(BASE + '/schedule-proposals', f.scheduler, body)).status, 409);
  f.db.sqlite.prepare("UPDATE posts SET status='published' WHERE id=?").run(draft.post_id);
  assert.equal((await f.call(BASE + '/schedule-proposals', f.scheduler, { ...body, draft_revision: await draftRevision(await getPost(f.db, draft.post_id)) })).status, 409);
});

test('deleted draft replay never resurrects it', async () => {
  const f = await fixture(), draft = await f.draft();
  f.db.sqlite.prepare('DELETE FROM posts WHERE id=?').run(draft.post_id);
  const replay = await f.call(BASE + '/drafts', f.writer, DRAFT);
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).artifact_available, false);
  assert.equal(f.count('posts'), 0);
});

test('public publish, status overrides, scheduled job injection and administrative mutations are denied', async () => {
  const f = await fixture();
  for (const field of ['status', 'mode', 'published_at', 'scheduled_at', 'pipeline_id', 'agent_id', 'approval']) {
    assert.equal((await f.call(BASE + '/drafts', f.writer, { ...DRAFT, [field]: 'published' })).status, 400);
  }
  const draft = await f.draft();
  for (const token of [f.writer, f.scheduler]) {
    for (const path of [BASE + '/drafts/' + draft.post_id + '/publish', BASE + '/approve', BASE + '/drafts/' + draft.post_id])
      assert.equal((await f.call(path, token, {}, 'POST')).status, 403);
    for (const path of ['/api/publish/v1/posts/' + draft.post_id + '/publish', '/api/cms/v1/posts/' + draft.post_id, '/api/admin/posts/' + draft.post_id]) {
      const response = await worker.fetch(request(path, token, { status: 'published' }, path.includes('/publish/v1') ? 'POST' : 'PUT'), f.env);
      assert.equal(response.status, 401, path);
    }
  }
  assert.equal((await getPost(f.db, draft.post_id)).status, 'draft');
});

test('fleet kill switch stops credential issuance and preparation but owner can inspect evidence', async () => {
  const f = await fixture();
  await f.draft();
  f.env.AI_AGENT_FLEET_ENABLED = '0';
  assert.equal((await f.call(BASE + '/drafts', f.writer, DRAFT)).status, 503);
  assert.equal((await f.call(ADMIN + '/credentials', f.admin, { agent_id: 'agent-11', pipeline_id: PIPELINE })).status, 503);
  assert.equal((await f.call(ADMIN + '?pipeline_id=' + PIPELINE, f.admin)).status, 200);
});

test('bounded ingress validates schedule, body size and JSON before mutations', async () => {
  const f = await fixture(), draft = await f.draft();
  for (const schedule of ['2026-02-30 10:00', '2000-01-01 00:00', '2099-01-01T10:00Z']) {
    assert.equal((await f.call(BASE + '/schedule-proposals', f.scheduler, { request_id: 'content-schedule-005', post_id: draft.post_id, draft_revision: draft.draft_revision, schedule })).status, 400);
  }
  const large = request(BASE + '/drafts', f.writer, { ...DRAFT, content: 'a'.repeat(160000) });
  assert.equal((await handleContentPrepApi(large, f.env)).status, 413);
  const invalid = new Request('https://phanthuanxtra.com' + BASE + '/drafts', { method: 'POST', headers: { authorization: 'Bearer ' + f.writer, 'content-type': 'application/json' }, body: '{' });
  assert.equal((await handleContentPrepApi(invalid, f.env)).status, 400);
  assert.equal(f.count('posts'), 1);
});

test('existing explicitly authorized editorial scheduling continues to publish due jobs', async () => {
  const f = await fixture();
  const now = Date.now();
  await submitArticles(f.db, [{ title: 'Owner scheduled article', content: 'Owner approved content', mode: 'schedule', schedule: futureSchedule() }], { chatId: 'owner-test', submissionId: 'owner-request-0001', now });
  assert.equal((await publishDueArticles(f.env, { now: now + 86400000 * 2 })).published, 1);
});
