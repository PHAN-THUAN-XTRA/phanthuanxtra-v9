import assert from 'node:assert/strict';
import { runnerFixture } from '../tests/helpers/content-runner-fixture.mjs';
import { runContentBrief } from './content-runner-client.mjs';
import { publishDueArticles } from '../src/editorial-publishing.js';

const f = await runnerFixture(); let lost = false;
const transport = async request => {
  const response = await f.transport(request);
  if (!lost && (await response.clone().json()).stage === 'schedule') { lost = true; throw new Error('simulated lost draft checkpoint response'); }
  return response;
};
const options = { writer: f.writer, scheduler: f.scheduler, transport, wait: f.wait };
const result = await runContentBrief(f.brief, options);
const replay = await runContentBrief(f.brief, options);
await publishDueArticles(f.env, {}, Date.now() + 3 * 86400000);
const posts = f.db.sqlite.prepare('SELECT id,status FROM posts').all();
const pending = f.db.sqlite.prepare("SELECT COUNT(*) n FROM editorial_jobs WHERE status='pending'").get().n;
assert.equal(result.status, 'completed'); assert.equal(f.calls(), 1); assert.equal(posts.length, 1);
assert.equal(posts[0].status, 'draft'); assert.equal(pending, 0); assert.equal(replay.result.post_id, result.result.post_id);
console.log(JSON.stringify({ mode: 'offline-simulation', real_ai_calls: 0, simulated_ai_calls: f.calls(),
  completion: result.status, checkpoints: ['generate', 'draft', 'schedule', 'done'], lost_response_reconciled: lost,
  replay_same_artifact: true, private_drafts: posts.length, proposed_schedule: result.result.proposal,
  pending_publication_jobs: pending, publicPublish: false, autoPublish: false,
  sample_article: result.result.post, requires_owner_approval: true }, null, 2));
