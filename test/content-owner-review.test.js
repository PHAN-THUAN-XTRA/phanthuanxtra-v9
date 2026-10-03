import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ownerReviewFixture } from '../tests/helpers/content-owner-review-fixture.mjs';
import { publishDueArticles } from '../src/editorial-publishing.js';
import worker from '../src/entry.js';

const editBody = f => ({ request_id: 'owner-review-edit-001', expected_revision: f.draft.draft_revision, title: 'Tiêu đề owner đã sửa', content: 'Nội dung owner đã kiểm tra.', excerpt: '', category: 'Tin tức', tags: ['owner'] });
const decideBody = f => ({ request_id: 'owner-review-decision-001', expected_revision: f.draft.draft_revision, decision: 'accepted' });
const count = (f, sql) => f.db.sqlite.prepare(sql).get().n;
test('owner review rejects anonymous/raw/scoped credentials before DB access and denies publication routes', async () => {
  const f = await ownerReviewFixture();
  for (const credential of ['', f.writer, f.scheduler, f.env.ADMIN_PASSWORD]) assert.equal((await f.call('', undefined, 'GET', credential)).status, 401);
  assert.equal((await f.call('/requests/' + f.proposalKey + '/publish', {})).status, 403);
  assert.equal(f.calls(), 0);
});
test('owner list/detail show private copy, current revision, proposed time and sanitized runner metadata', async () => {
  const f = await ownerReviewFixture();
  const list = await (await f.call('')).json();
  assert.equal(list.drafts.length, 1); assert.equal(list.drafts[0].latest_proposal.stale, false);
  assert.equal(list.drafts[0].post, undefined); assert.equal(list.budget.calls, 0); assert.equal(list.publicPublish, false);
  const detail = await (await f.call('/drafts/' + f.draft.request_key)).json();
  assert.equal(detail.draft.post.content, 'Nội dung riêng tư để owner kiểm tra.'); assert.equal(detail.proposals.length, 1);
  assert.equal(detail.history.length, 0); assert.equal(detail.draft.current_revision, f.draft.draft_revision);
  const serialized = JSON.stringify(list); assert.ok(!serialized.includes(f.writer)); assert.ok(!serialized.includes(f.scheduler)); assert.ok(!serialized.includes(f.admin));
});
test('owner list excludes deleted fixture clutter and internal run prompts/output/lease secrets', async () => {
  const f = await ownerReviewFixture(), nonce = crypto.randomUUID();
  f.db.sqlite.prepare('INSERT INTO xtra_content_runs(run_key,pipeline_id,request_id,fingerprint,input_json,output_json,lease_token,status,error_code) VALUES(?,?,?,?,?,?,?,?,?)')
    .run('a'.repeat(64), f.pipeline, 'owner-review-run-metadata-001', 'b'.repeat(64), JSON.stringify({ source: f.writer }), JSON.stringify({ content: f.scheduler }), nonce, 'blocked', 'MODEL_UNAVAILABLE');
  let list = await (await f.call('')).json(); assert.equal(list.runs.length, 1); assert.equal(list.runs[0].error_code, 'MODEL_UNAVAILABLE');
  for (const privateValue of [nonce, f.writer, f.scheduler]) assert.ok(!JSON.stringify(list).includes(privateValue));
  f.db.sqlite.prepare('DELETE FROM posts').run(); list = await (await f.call('')).json();
  assert.equal(list.drafts.length, 0); assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_prep_requests'), 2);
});
test('accepting a proposal records review once; no executable schedule or public permission is created', async () => {
  const f = await ownerReviewFixture(), suffix = '/requests/' + f.proposalKey + '/decision', body = decideBody(f);
  const replies = await Promise.all(Array.from({ length: 5 }, () => f.call(suffix, body)));
  assert.ok(replies.every(r => r.status === 200));
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_reviews'), 1);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_operations'), 1);
  assert.equal(count(f, "SELECT COUNT(*) n FROM cms_audit_log WHERE resource='content-review'"), 1);
  assert.equal(f.db.sqlite.prepare('SELECT status FROM posts').get().status, 'draft');
  await publishDueArticles(f.env, {}, Date.now() + 3 * 86400000);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM editorial_jobs'), 0);
  assert.equal((await (await f.call('/drafts/' + f.draft.request_key)).json()).proposals[0].review.decision, 'accepted');
});
test('same operation ID with changed payload conflicts; a review decision cannot silently flip', async () => {
  const f = await ownerReviewFixture(), suffix = '/requests/' + f.proposalKey + '/decision';
  await f.call(suffix, decideBody(f));
  assert.equal((await f.call(suffix, { ...decideBody(f), decision: 'dismissed' })).status, 409);
  assert.equal((await f.call(suffix, { ...decideBody(f), request_id: 'owner-different-decision-001', decision: 'dismissed' })).status, 409);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_reviews'), 1);
});
test('JSON field order does not change operation identity; decision audit failure rolls everything back', async () => {
  const f = await ownerReviewFixture(), suffix = '/requests/' + f.proposalKey + '/decision';
  f.db.sqlite.exec("CREATE TRIGGER reject_review_audit BEFORE INSERT ON cms_audit_log WHEN NEW.resource='content-review' BEGIN SELECT RAISE(ABORT,'simulated audit failure'); END");
  assert.equal((await f.call(suffix, decideBody(f))).status, 503);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_operations'), 0); assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_reviews'), 0);
  f.db.sqlite.exec('DROP TRIGGER reject_review_audit');
  assert.equal((await (await f.call(suffix, decideBody(f))).json()).duplicate, false);
  const reordered = Object.fromEntries(Object.entries(decideBody(f)).reverse());
  assert.equal((await (await f.call(suffix, reordered)).json()).duplicate, true);
});
test('owner may edit only private copy; prior review and schedule become inactive and stale', async () => {
  const f = await ownerReviewFixture(); await f.call('/requests/' + f.proposalKey + '/decision', decideBody(f));
  assert.equal((await f.call('/drafts/' + f.draft.request_key, editBody(f), 'PATCH')).status, 200);
  const detail = await (await f.call('/drafts/' + f.draft.request_key)).json();
  assert.equal(detail.draft.post.title, editBody(f).title); assert.equal(detail.draft.post.slug, f.draft.post.slug); assert.equal(detail.draft.post.status, 'draft');
  assert.equal(detail.proposals[0].stale, true); assert.ok(detail.proposals[0].stale_reasons.includes('revision_changed')); assert.equal(detail.proposals[0].review, null);
  assert.equal(detail.history.length, 2); assert.notEqual(detail.draft.current_revision, f.draft.draft_revision);
  assert.equal((await f.call('/requests/' + f.proposalKey + '/decision', { ...decideBody(f), request_id: 'owner-review-after-edit-001', expected_revision: detail.draft.current_revision })).status, 409);
  assert.equal((await f.call('/drafts/' + f.draft.request_key, editBody(f), 'PATCH')).status, 200); // lost-response replay returns prior canonical edit
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_operations'), 2);
});
test('unknown fields, status/slug/cover/publish overrides and invalid edits are rejected', async () => {
  const f = await ownerReviewFixture();
  for (const override of [{ status: 'published' }, { slug: 'new-slug' }, { cover_image: '/media/other.webp' }, { publish: true }, { actor: 'agent-20' }]) assert.equal((await f.call('/drafts/' + f.draft.request_key, { ...editBody(f), ...override }, 'PATCH')).status, 400);
  assert.equal((await f.call('/drafts/' + f.draft.request_key, { ...editBody(f), content: '' }, 'PATCH')).status, 400);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_operations'), 0);
});
test('stale revisions, elapsed schedules, deleted or published drafts cannot be accepted/edited', async () => {
  const f = await ownerReviewFixture();
  assert.equal((await f.call('/drafts/' + f.draft.request_key, { ...editBody(f), expected_revision: 'a'.repeat(64) }, 'PATCH')).status, 409);
  f.db.sqlite.prepare("UPDATE xtra_content_prep_requests SET proposed_at='2000-01-01T00:00:00.000Z' WHERE action='prepare-schedule'").run();
  assert.equal((await f.call('/requests/' + f.proposalKey + '/decision', decideBody(f))).status, 409);
  f.db.sqlite.prepare("UPDATE posts SET status='published'").run();
  assert.equal((await f.call('/drafts/' + f.draft.request_key, editBody(f), 'PATCH')).status, 409);
  f.db.sqlite.prepare('DELETE FROM posts').run();
  assert.equal((await f.call('/requests/' + f.draft.request_key + '/decision', decideBody(f))).status, 409);
  assert.equal((await (await f.call('/drafts/' + f.draft.request_key)).json()).draft.stale_reasons[0], 'deleted');
  assert.equal(count(f, 'SELECT COUNT(*) n FROM posts'), 0);
});
test('the transaction rechecks revision fields against a concurrent owner edit', async () => {
  const f = await ownerReviewFixture(), batch = f.db.batch.bind(f.db); let changed = false;
  f.db.batch = async statements => { if (!changed) { changed = true; f.db.sqlite.prepare("UPDATE posts SET content='Concurrent owner copy'").run(); } return batch(statements); };
  assert.equal((await f.call('/requests/' + f.proposalKey + '/decision', decideBody(f))).status, 409);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_operations'), 0);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_reviews'), 0);
});
test('failed audit rolls back the edit, operation and decision; retry is safe', async () => {
  const f = await ownerReviewFixture(); f.db.sqlite.exec('DROP TABLE cms_audit_log');
  assert.equal((await f.call('/drafts/' + f.draft.request_key, editBody(f), 'PATCH')).status, 503);
  assert.equal(count(f, 'SELECT COUNT(*) n FROM xtra_content_owner_operations'), 0);
  assert.equal(f.db.sqlite.prepare('SELECT title FROM posts').get().title, f.draft.post.title);
  f.db.sqlite.exec('CREATE TABLE cms_audit_log (actor TEXT,action TEXT,resource TEXT,resource_id TEXT,summary TEXT)');
  assert.equal((await f.call('/drafts/' + f.draft.request_key, editBody(f), 'PATCH')).status, 200);
});
test('a lost edit response reconciles from history and replays without another mutation/audit', async () => {
  const f = await ownerReviewFixture(), batch = f.db.batch.bind(f.db); let lost = false;
  f.db.batch = async statements => { const result = await batch(statements); if (!lost) { lost = true; throw new Error('response lost'); } return result; };
  assert.equal((await f.call('/drafts/' + f.draft.request_key, editBody(f), 'PATCH')).status, 503);
  const history = (await (await f.call('/drafts/' + f.draft.request_key)).json()).history;
  assert.equal(history[0].request_id, editBody(f).request_id);
  assert.equal((await f.call('/drafts/' + f.draft.request_key, editBody(f), 'PATCH')).status, 200);
  assert.equal(count(f, "SELECT COUNT(*) n FROM cms_audit_log WHERE resource='content-review'"), 1);
});
test('pagination is bounded and stable; pipeline filters and cursors are validated', async () => {
  const f = await ownerReviewFixture(); for (let i = 0; i < 24; i++) await f.create('owner-pagination-draft-' + String(i).padStart(3, '0'));
  const first = await (await f.call('')).json(), second = await (await f.call('?cursor=' + first.next_cursor)).json();
  assert.equal(first.drafts.length, 20); assert.equal(second.drafts.length, 5);
  assert.equal(new Set([...first.drafts, ...second.drafts].map(d => d.request_key)).size, 25);
  assert.equal((await f.call('?pipeline_id=bad')).status, 400); assert.equal((await f.call('?cursor=bad')).status, 400);
  assert.equal((await (await f.call('?pipeline_id=other-pipeline-0001')).json()).drafts.length, 0);
});
test('owner review remains available while fleet and live inference are disabled', async () => {
  const f = await ownerReviewFixture(); f.env.AI_AGENT_FLEET_ENABLED = '0'; f.env.CONTENT_RUNNER_LIVE_ENABLED = '0';
  assert.equal((await f.call('/requests/' + f.draft.request_key + '/decision', decideBody(f))).status, 200);
  const list = await (await f.call('')).json(); assert.equal(list.fleet_enabled, false); assert.equal(list.live_enabled, false); assert.equal(f.calls(), 0);
});
test('Telegram review requires fresh signed owner initData and records the authenticated actor', async () => {
  const f = await ownerReviewFixture(); f.env.TELEGRAM_AUTO_BOT_TOKEN = crypto.randomUUID(); f.env.TELEGRAM_AUTO_PUBLISH_CHAT_IDS = '6451516147';
  async function signed(userId, authDate = Math.floor(Date.now() / 1000)) {
    const p = new URLSearchParams({ user: JSON.stringify({ id: userId }), auth_date: String(authDate), query_id: crypto.randomUUID() });
    const text = [...p].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + '=' + v).join('\n');
    const hmac = async (bytes, data) => new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(data)));
    const key = await hmac(new TextEncoder().encode('WebAppData'), f.env.TELEGRAM_AUTO_BOT_TOKEN);
    p.set('hash', [...await hmac(key, text)].map(b => b.toString(16).padStart(2, '0')).join('')); return p.toString();
  }
  const req = (init, suffix = '', body) => new Request('https://phanthuanxtra.com/api/telegram/mini/v1/content-review' + suffix, { method: body ? 'POST' : 'GET', headers: { 'x-telegram-init-data': init, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await worker.fetch(req(''), f.env)).status, 401);
  assert.equal((await worker.fetch(req(await signed(123456)), f.env)).status, 403);
  assert.equal((await worker.fetch(req(await signed(6451516147, Math.floor(Date.now() / 1000) - 1000)), f.env)).status, 401);
  const init = await signed(6451516147);
  assert.equal((await worker.fetch(req(init), f.env)).status, 200);
  assert.equal((await worker.fetch(req(init, '/requests/' + f.proposalKey + '/decision', decideBody(f)), f.env)).status, 200);
  assert.equal(f.db.sqlite.prepare('SELECT actor FROM xtra_content_owner_reviews').get().actor, 'owner-telegram:6451516147');
});
test('shared owner UI uses safe text DOM and is reachable in both Admin variants and Mini App', () => {
  const ui = fs.readFileSync('public/content-review.js', 'utf8');
  assert.doesNotMatch(ui, /innerHTML|insertAdjacentHTML|\/publish|ADMIN_PASSWORD|issueContentPrepToken/);
  assert.match(ui, /textContent/); assert.match(ui, /expected_revision/); assert.match(ui, /history.some/);
  for (const path of ['public/admin-control', 'public/admin-control.html', 'public/telegram-mini-app.html']) {
    const html = fs.readFileSync(path, 'utf8'); assert.match(html, /content-review\.js/); assert.match(html, /content-review\.css/); assert.match(html, /contentReview/);
  }
});
