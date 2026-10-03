import test from 'node:test';
import assert from 'node:assert/strict';
import { runnerFixture, sampleCopy } from '../tests/helpers/content-runner-fixture.mjs';
import { runContentBrief } from '../scripts/content-runner-client.mjs';
import { issueContentPrepToken } from '../src/content-prep-auth.js';
import { publishDueArticles } from '../src/editorial-publishing.js';
import worker from '../src/entry.js';

const driver = (f, extra = {}) => runContentBrief(f.brief, { writer: f.writer, scheduler: f.scheduler, transport: f.transport, wait: f.wait, ...extra });
const runRow = f => f.db.sqlite.prepare('SELECT * FROM xtra_content_runs LIMIT 1').get();
test('complete offline runner creates one private draft and one non-executable proposal; replay never regenerates', async () => {
  const f = await runnerFixture(), done = await driver(f);
  assert.equal(done.status, 'completed'); assert.equal(f.calls(), 1);
  assert.equal(done.result.post.status, 'draft'); assert.equal(done.result.post.content, sampleCopy.content);
  assert.equal(done.result.post.url, null); assert.equal(done.result.proposal.state, 'proposed');
  assert.equal(done.publicPublish, false); assert.equal(done.autoPublish, false);
  assert.equal((await driver(f)).result.post_id, done.result.post_id); assert.equal(f.calls(), 1);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM posts').get().n, 1);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM xtra_content_prep_requests').get().n, 2);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM cms_audit_log').get().n, 5);
  await publishDueArticles(f.env, {}, Date.now() + 3 * 86400000);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM editorial_jobs').get().n, 0);
  assert.equal((await worker.fetch(new Request('https://phanthuanxtra.com/blog/' + done.result.post.slug), f.env)).status, 404);
  const persisted = JSON.stringify(runRow(f)) + JSON.stringify(f.db.sqlite.prepare('SELECT * FROM cms_audit_log').all());
  assert.ok(!persisted.includes(f.writer)); assert.ok(!persisted.includes(f.scheduler));
});
test('live defaults off; preview calls no provider and writes no artifacts or ledger', async () => {
  const f = await runnerFixture(); delete f.env.CONTENT_RUNNER_LIVE_ENABLED;
  assert.equal((await f.transport(f.request())).status, 503);
  const preview = await driver(f, { preview: true });
  assert.equal(preview.preview_only, true); assert.equal(preview.persisted, false); assert.equal(preview.article.content, f.brief.source);
  assert.equal(f.calls(), 0); assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM xtra_content_runs').get().n, 0);
  f.env.AI_AGENT_FLEET_ENABLED = '0'; assert.equal((await f.transport(f.request(f.brief, '/preview'))).status, 503);
});
test('credentials require both actions in the same pipeline, deny expiry and never grant publishing', async () => {
  const f = await runnerFixture();
  const other = (await issueContentPrepToken(f.env, { agent_id: 'agent-19', pipeline_id: 'different-pipeline-001' })).token;
  for (const [w, s, status] of [[f.writer, '', 401], [f.scheduler, f.writer, 403], [f.writer, other, 403]]) assert.equal((await f.transport(f.request(f.brief, '', 'POST', w, s))).status, status);
  f.tick(3600001); assert.equal((await f.transport(f.request())).status, 401); assert.equal(f.calls(), 0);
  assert.equal((await worker.fetch(new Request('https://phanthuanxtra.com/api/publish/v1/posts/1/publish', { method: 'POST', headers: { authorization: 'Bearer ' + f.writer } }), f.env)).status, 401);
});
test('brief/action/model output overrides are rejected before creating a draft', async () => {
  const f = await runnerFixture();
  for (const body of [{ ...f.brief, publish: true }, { ...f.brief, model: 'other' }, { ...f.brief, source: 'x'.repeat(12001) }, { ...f.brief, schedule: '2026-02-30 12:00' }]) assert.equal((await f.transport(f.request(body))).status, 400);
  f.env.AI.run = async () => ({ response: JSON.stringify({ ...sampleCopy, status: 'published' }) });
  const r = await (await f.transport(f.request())).json(); assert.equal(r.status, 'blocked'); assert.equal(r.error_code, 'MODEL_OUTPUT_INVALID');
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM posts').get().n, 0);
});
test('parallel requests hold a fenced lease and make one model call', async () => {
  const f = await runnerFixture();
  const responses = await Promise.all(Array.from({ length: 8 }, () => f.transport(f.request())));
  assert.ok(responses.every(r => r.status === 202)); assert.equal(f.calls(), 1);
  assert.equal((await driver(f)).status, 'completed'); assert.equal(f.calls(), 1);
});
test('quota retries consume at most three reservations with bounded backoff; no fabricated fallback', async () => {
  const f = await runnerFixture(); let count = 0;
  f.env.AI.run = async () => { count++; throw new Error('quota 429'); };
  await assert.rejects(driver(f), /MODEL_UNAVAILABLE/);
  assert.equal(count, 3); assert.equal(runRow(f).status, 'blocked'); assert.equal(runRow(f).generation_calls, 3);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM posts').get().n, 0);
});
test('timeout reserves cost and cannot exceed the per-run call ceiling', async () => {
  const f = await runnerFixture(); f.env.AI.run = () => new Promise(() => {});
  await assert.rejects(driver(f), /MODEL_TIMEOUT/);
  assert.equal(runRow(f).generation_calls, 3); assert.equal(runRow(f).status, 'blocked');
});
test('the global daily cap is shared across runs and cannot be overridden by callers', async () => {
  const f = await runnerFixture();
  for (let i = 0; i < 13; i++) await f.transport(f.request({ ...f.brief, request_id: 'daily-budget-run-' + String(i).padStart(3, '0') }));
  assert.equal(f.calls(), 12);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM xtra_content_model_calls').get().n, 12);
  assert.equal(f.db.sqlite.prepare("SELECT error_code FROM xtra_content_runs WHERE request_id='daily-budget-run-012'").get().error_code, 'MODEL_BUDGET_EXHAUSTED');
});
test('same request with a changed brief conflicts; other pipelines cannot reconcile it', async () => {
  const f = await runnerFixture(); await f.transport(f.request());
  assert.equal((await f.transport(f.request({ ...f.brief, source: 'Changed source' }))).status, 409);
  const w = (await issueContentPrepToken(f.env, { agent_id: 'agent-11', pipeline_id: 'other-pipeline-0001' })).token;
  const s = (await issueContentPrepToken(f.env, { agent_id: 'agent-19', pipeline_id: 'other-pipeline-0001' })).token;
  assert.equal((await f.transport(f.request(null, '/' + f.brief.request_id, 'GET', w, s))).status, 404);
});
test('client reconciles a lost response after completion without another AI call or artifact', async () => {
  const f = await runnerFixture(); let lost = false;
  const transport = async req => { const r = await f.transport(req); if (!lost && r.status === 200 && (await r.clone().json()).status === 'completed') { lost = true; throw new Error('response lost'); } return r; };
  assert.equal((await driver(f, { transport })).status, 'completed'); assert.equal(f.calls(), 1);
});
test('lost artifact checkpoint resumes the atomic request without duplicating the private draft', async () => {
  const f = await runnerFixture(); await f.transport(f.request());
  const batch = f.db.batch.bind(f.db); let lost = false;
  f.db.batch = async statements => { const r = await batch(statements); if (!lost) { lost = true; throw new Error('artifact response lost'); } return r; };
  const r = await (await f.transport(f.request())).json(); assert.equal(r.status, 'retry');
  assert.equal((await driver(f)).status, 'completed'); assert.equal(f.calls(), 1);
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM posts').get().n, 1);
});
test('owner edits between checkpoints block the proposal while retaining a private draft', async () => {
  const f = await runnerFixture(); await f.transport(f.request()); await f.transport(f.request());
  f.db.sqlite.prepare("UPDATE posts SET content='Owner changed copy'").run();
  const r = await (await f.transport(f.request())).json(); assert.equal(r.status, 'blocked'); assert.equal(r.error_code, 'ARTIFACT_CONFLICT');
  assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM editorial_jobs').get().n, 0);
});
test('crashed lease can be reclaimed; stale workers cannot overwrite a newer checkpoint', async () => {
  const f = await runnerFixture(); let release;
  f.env.AI.run = () => new Promise(resolve => { release = resolve; });
  const first = f.transport(f.request());
  // Observe the persisted claim before moving the virtual clock.
  for (let i = 0; i < 40 && !release; i++) await new Promise(resolve => setTimeout(resolve, 1));
  assert.ok(release); f.tick(120001);
  f.env.AI.run = async () => ({ response: JSON.stringify(sampleCopy) });
  await f.transport(f.request());
  release({ response: JSON.stringify({ ...sampleCopy, title: 'Stale generation' }) }); await first;
  assert.equal(runRow(f).stage, 'draft'); assert.equal(JSON.parse(runRow(f).output_json).title, sampleCopy.title);
  assert.equal(runRow(f).generation_calls, 2);
});
test('completed run reconciliation reports owner edits/deletion and never resurrects an artifact', async () => {
  const f = await runnerFixture(); await driver(f);
  f.db.sqlite.prepare("UPDATE posts SET content='Owner revised after completion'").run();
  let current = await (await f.transport(f.request(null, '/' + f.brief.request_id, 'GET'))).json();
  assert.equal(current.status, 'completed'); assert.equal(current.result.proposal.stale, true);
  await assert.rejects(driver(f), /COMPLETED_ARTIFACT_STALE/);
  f.db.sqlite.prepare('DELETE FROM posts').run();
  current = await (await f.transport(f.request())).json();
  assert.equal(current.result.artifact_available, false); assert.equal(current.result.proposal.stale, true);
  assert.equal(f.calls(), 1); assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM posts').get().n, 0);
});
test('checkpoint audit failure retains prior stage and retries without exceeding the generation budget', async () => {
  const f = await runnerFixture();
  f.db.sqlite.exec("CREATE TRIGGER reject_runner_checkpoint BEFORE INSERT ON cms_audit_log WHEN NEW.actor='content-runner' BEGIN SELECT RAISE(ABORT,'simulated audit failure'); END");
  const r = await (await f.transport(f.request())).json();
  assert.equal(r.stage, 'generate'); assert.equal(r.status, 'retry'); assert.equal(r.generation_calls, 1);
  assert.equal(runRow(f).output_json, null);
  f.db.sqlite.exec('DROP TRIGGER reject_runner_checkpoint');
  assert.equal((await driver(f)).status, 'completed'); assert.equal(f.calls(), 2);
});
test('expired delegation pauses preparation and renewed scopes resume the saved generation', async () => {
  const f = await runnerFixture();
  const short = (await issueContentPrepToken(f.env, { agent_id: 'agent-11', pipeline_id: f.pipeline, ttl_seconds: 60 })).token;
  await f.transport(f.request(f.brief, '', 'POST', short)); f.tick(60001);
  assert.equal((await f.transport(f.request(f.brief, '', 'POST', short))).status, 401);
  assert.equal(runRow(f).stage, 'draft');
  const renewed = (await issueContentPrepToken(f.env, { agent_id: 'agent-11', pipeline_id: f.pipeline, ttl_seconds: 900 })).token;
  assert.equal((await driver(f, { writer: renewed })).status, 'completed'); assert.equal(f.calls(), 1);
});
