import { verifyAdminToken } from './admin-auth.js';
import { draftRevision } from './content-prep-api.js';
import { validPipeline } from './content-prep-auth.js';
import { publicationKey, validateArticle } from './editorial-publishing.js';
import { getPost } from './post-persistence.js';
import { boundedBytes } from './publishing-api.js';

export const OWNER_REVIEW_BASE = '/api/admin/agents/content-prep/review';
const json = (value, status = 200) => Response.json(value, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const permissions = { publicPublish: false, autoPublish: false, review_only: true };
class ReviewError extends Error { constructor(code, status = 400) { super(code); this.status = status; } }
const validKey = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const revisionFields = p => [p.title, p.slug, p.excerpt, p.content, p.cover_image, p.category, p.tags_json];
const targetFor = (db, key) => db.prepare("SELECT * FROM xtra_content_prep_requests WHERE request_key=? AND status='completed'").bind(key).first();
const decisionKey = (key, revision, due) => publicationKey(JSON.stringify([key, revision, due]));
async function readBody(request, fields) {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new ReviewError('JSON_REQUIRED', 415);
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 150 * 1024))); } catch { throw new ReviewError('JSON_INVALID'); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !fields.includes(k))) throw new ReviewError('REVIEW_FIELDS_INVALID');
  if (typeof value.request_id !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(value.request_id) || !validKey(value.expected_revision)) throw new ReviewError('REVIEW_REQUEST_INVALID');
  return value;
}
async function currentTarget(db, row) {
  const post = row.post_id ? await getPost(db, row.post_id) : null;
  const revision = post ? await draftRevision(post) : null;
  const reasons = [];
  if (!post) reasons.push('deleted');
  else if (post.status !== 'draft') reasons.push('not_private_draft');
  if (row.action === 'prepare-schedule') {
    if (post && row.draft_revision !== revision) reasons.push('revision_changed');
    if (Date.parse(row.proposed_at) <= Date.now()) reasons.push('schedule_passed');
  }
  const key = revision ? await decisionKey(row.request_key, revision, row.proposed_at) : null;
  const review = key ? await db.prepare('SELECT review_key,decision,actor,draft_revision,proposed_at,decided_at FROM xtra_content_owner_reviews WHERE review_key=?').bind(key).first() : null;
  return { request_key: row.request_key, request_id: row.request_id, pipeline_id: row.pipeline_id, action: row.action, created_at: row.created_at,
    post_id: row.post_id, title: post?.title || 'Nháp đã xóa', post_status: post?.status || null,
    current_revision: revision, proposed_revision: row.draft_revision, proposed_at: row.proposed_at,
    stale: reasons.length > 0, stale_reasons: reasons, review, post };
}
async function listReview(request, env, db) {
  const params = new URL(request.url).searchParams, pipeline = params.get('pipeline_id') || '', cursor = params.get('cursor');
  if (pipeline && !validPipeline(pipeline)) throw new ReviewError('PIPELINE_INVALID');
  if (cursor && !validKey(cursor)) throw new ReviewError('CURSOR_INVALID');
  const after = cursor ? await targetFor(db, cursor) : null;
  if (cursor && (!after || after.action !== 'create-draft' || (pipeline && after.pipeline_id !== pipeline))) throw new ReviewError('CURSOR_INVALID');
  const date = after?.created_at || '9999', key = after?.request_key || 'f'.repeat(64);
  const rows = (await db.prepare(`SELECT * FROM xtra_content_prep_requests WHERE action='create-draft' AND status='completed' AND post_id IS NOT NULL
    AND (?='' OR pipeline_id=?) AND (created_at<? OR (created_at=? AND request_key<?)) ORDER BY created_at DESC,request_key DESC LIMIT 21`)
    .bind(pipeline, pipeline, date, date, key).all()).results || [];
  const drafts = await Promise.all(rows.slice(0, 20).map(async row => {
    const current = await currentTarget(db, row);
    const proposal = row.post_id ? await db.prepare("SELECT * FROM xtra_content_prep_requests WHERE pipeline_id=? AND post_id=? AND action='prepare-schedule' AND status='completed' ORDER BY created_at DESC,request_key DESC LIMIT 1").bind(row.pipeline_id, row.post_id).first() : null;
    const latest = proposal ? await currentTarget(db, proposal) : null;
    const { post, ...summary } = current;
    const { post: ignored, ...proposalSummary } = latest || {};
    return { ...summary, latest_proposal: latest ? proposalSummary : null };
  }));
  const runs = (await db.prepare(`SELECT run_key,request_id,pipeline_id,stage,status,generation_calls,stage_attempts,error_code,next_attempt_at,lease_until,created_at,updated_at
    FROM xtra_content_runs WHERE (?='' OR pipeline_id=?) ORDER BY created_at DESC,run_key DESC LIMIT 20`).bind(pipeline, pipeline).all()).results || [];
  const day = new Date().toISOString().slice(0, 10);
  const budget = await db.prepare('SELECT COUNT(*) calls FROM xtra_content_model_calls WHERE day=?').bind(day).first();
  return json({ ok: true, drafts, runs, next_cursor: rows.length > 20 ? rows[19].request_key : null,
    live_enabled: env.CONTENT_RUNNER_LIVE_ENABLED === '1', fleet_enabled: env.AI_AGENT_FLEET_ENABLED !== '0',
    budget: { day, calls: Number(budget?.calls || 0), limit: 12 }, ...permissions });
}
async function detail(db, key) {
  const row = await targetFor(db, key);
  if (!row || row.action !== 'create-draft') throw new ReviewError('DRAFT_NOT_FOUND', 404);
  const current = await currentTarget(db, row);
  const proposals = row.post_id ? (await db.prepare("SELECT * FROM xtra_content_prep_requests WHERE pipeline_id=? AND post_id=? AND action='prepare-schedule' AND status='completed' ORDER BY created_at DESC,request_key DESC LIMIT 20").bind(row.pipeline_id, row.post_id).all()).results || [] : [];
  const history = (await db.prepare(`SELECT o.request_id,o.action,o.actor,o.created_at,o.target_key,o.result_json FROM xtra_content_owner_operations o
    WHERE o.status='completed' AND (o.target_key=? OR o.target_key IN (SELECT request_key FROM xtra_content_prep_requests WHERE post_id=? AND pipeline_id=?))
    ORDER BY o.created_at DESC,o.operation_key DESC LIMIT 50`).bind(key, row.post_id, row.pipeline_id).all()).results || [];
  return json({ ok: true, draft: current, proposals: await Promise.all(proposals.map(async p => {
    const { post, ...summary } = await currentTarget(db, p); return summary;
  })), history: history.map(({ result_json, ...h }) => ({ ...h, result: JSON.parse(result_json) })), ...permissions });
}
async function operation(db, body, key, action, payload) {
  const opKey = await publicationKey(body.request_id), fingerprint = await publicationKey(JSON.stringify([key, action, Object.keys(payload).sort().map(k => [k, payload[k]])]));
  const previous = await db.prepare('SELECT * FROM xtra_content_owner_operations WHERE operation_key=?').bind(opKey).first();
  if (previous && (previous.fingerprint !== fingerprint || previous.target_key !== key || previous.action !== action)) throw new ReviewError('REQUEST_CONFLICT', 409);
  return { opKey, fingerprint, previous };
}
function replay(op, duplicate = true) { return json({ ...JSON.parse(op.result_json), duplicate, ...permissions }); }
function audit(db, opKey) {
  return db.prepare(`INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
    SELECT actor,'owner-content-' || action,'content-review',target_key,'Private content review only; request=' || request_id
    FROM xtra_content_owner_operations WHERE operation_key=? AND status='claimed'`).bind(opKey);
}
function complete(db, opKey) { return db.prepare("UPDATE xtra_content_owner_operations SET status='completed' WHERE operation_key=? AND status='claimed'").bind(opKey); }
async function finish(db, op, duplicate) {
  const saved = await db.prepare('SELECT * FROM xtra_content_owner_operations WHERE operation_key=?').bind(op.opKey).first();
  if (!saved) throw new ReviewError('DRAFT_CHANGED_OR_REVIEWED', 409);
  if (saved.fingerprint !== op.fingerprint) throw new ReviewError('REQUEST_CONFLICT', 409);
  return replay(saved, duplicate);
}
async function edit(request, db, key, actor) {
  const body = await readBody(request, ['request_id', 'expected_revision', 'title', 'content', 'excerpt', 'category', 'tags']);
  if (body.tags != null && (!Array.isArray(body.tags) || body.tags.length > 30 || body.tags.some(t => typeof t !== 'string' || t.length > 80))) throw new ReviewError('TAGS_INVALID');
  const op = await operation(db, body, key, 'edit', body);
  if (op.previous) return replay(op.previous);
  const row = await targetFor(db, key);
  if (!row || row.action !== 'create-draft') throw new ReviewError('DRAFT_NOT_FOUND', 404);
  const current = await currentTarget(db, row), post = current.post;
  if (current.stale || current.current_revision !== body.expected_revision) throw new ReviewError('DRAFT_CHANGED', 409);
  let parsed;
  try { parsed = validateArticle({ title: body.title, content: body.content, excerpt: body.excerpt, category: body.category, tags: body.tags, slug: post.slug, cover_image: post.cover_image, mode: 'draft' }, Date.now()); } catch { throw new ReviewError('ARTICLE_INVALID'); }
  const updated = { ...post, title: parsed.title, content: parsed.content, excerpt: parsed.excerpt, category: parsed.category, tags_json: JSON.stringify(parsed.tags) };
  const revision = await draftRevision(updated), result = JSON.stringify({ ok: true, request_key: key, post_id: post.id, action: 'edit', draft_revision: revision, ...permissions });
  const writes = await db.batch([
    db.prepare(`INSERT INTO xtra_content_owner_operations(operation_key,request_id,target_key,action,fingerprint,actor,result_json)
      SELECT ?,?,?,'edit',?,?,? FROM posts p WHERE p.id=? AND p.status='draft'
      AND p.title IS ? AND p.slug IS ? AND p.excerpt IS ? AND p.content IS ? AND p.cover_image IS ? AND p.category IS ? AND p.tags_json IS ?
      ON CONFLICT(operation_key) DO NOTHING`).bind(op.opKey, body.request_id, key, op.fingerprint, actor, result, post.id, ...revisionFields(post)),
    db.prepare(`UPDATE posts SET title=?,content=?,excerpt=?,category=?,tags_json=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND EXISTS(SELECT 1 FROM xtra_content_owner_operations WHERE operation_key=? AND fingerprint=? AND status='claimed')`)
      .bind(updated.title, updated.content, updated.excerpt, updated.category, updated.tags_json, post.id, op.opKey, op.fingerprint),
    audit(db, op.opKey), complete(db, op.opKey)
  ]);
  return finish(db, op, !Number(writes[0]?.meta?.changes));
}
async function decide(request, db, key, actor) {
  const body = await readBody(request, ['request_id', 'expected_revision', 'decision']);
  if (!['accepted', 'dismissed'].includes(body.decision)) throw new ReviewError('DECISION_INVALID');
  const op = await operation(db, body, key, body.decision, body);
  if (op.previous) return replay(op.previous);
  const row = await targetFor(db, key);
  if (!row) throw new ReviewError('TARGET_NOT_FOUND', 404);
  const current = await currentTarget(db, row), post = current.post;
  if (current.current_revision !== body.expected_revision || current.stale) throw new ReviewError('REVIEW_STALE', 409);
  const reviewKey = await decisionKey(key, body.expected_revision, row.proposed_at);
  const result = JSON.stringify({ ok: true, request_key: key, review_key: reviewKey, decision: body.decision, draft_revision: body.expected_revision, proposed_at: row.proposed_at, ...permissions });
  const writes = await db.batch([
    db.prepare(`INSERT INTO xtra_content_owner_operations(operation_key,request_id,target_key,action,fingerprint,actor,result_json)
      SELECT ?,?,?,?,?,?,? FROM posts p WHERE p.id=? AND p.status='draft'
      AND p.title IS ? AND p.slug IS ? AND p.excerpt IS ? AND p.content IS ? AND p.cover_image IS ? AND p.category IS ? AND p.tags_json IS ?
      AND (? IS NULL OR julianday(?)>julianday('now')) AND NOT EXISTS(SELECT 1 FROM xtra_content_owner_reviews WHERE review_key=?)
      ON CONFLICT(operation_key) DO NOTHING`).bind(op.opKey, body.request_id, key, body.decision, op.fingerprint, actor, result, post.id, ...revisionFields(post), row.proposed_at, row.proposed_at, reviewKey),
    db.prepare(`INSERT INTO xtra_content_owner_reviews(review_key,request_key,operation_key,draft_revision,proposed_at,decision,actor)
      SELECT ?,target_key,operation_key,?,?,action,actor FROM xtra_content_owner_operations WHERE operation_key=? AND fingerprint=? AND status='claimed'
      ON CONFLICT(review_key) DO NOTHING`).bind(reviewKey, body.expected_revision, row.proposed_at, op.opKey, op.fingerprint),
    audit(db, op.opKey), complete(db, op.opKey)
  ]);
  return finish(db, op, !Number(writes[0]?.meta?.changes));
}
export async function handleContentOwnerReviewRoute(request, env, suffix, actor) {
  try {
    if (!env.DB) throw new ReviewError('D1_UNAVAILABLE', 503);
    const db = env.DB.withSession?.('first-primary') || env.DB;
    if (suffix === '' && request.method === 'GET') return await listReview(request, env, db);
    const draft = suffix.match(/^\/drafts\/([a-f0-9]{64})$/);
    if (draft && request.method === 'GET') return await detail(db, draft[1]);
    if (draft && request.method === 'PATCH') return await edit(request, db, draft[1], actor);
    const decision = suffix.match(/^\/requests\/([a-f0-9]{64})\/decision$/);
    if (decision && request.method === 'POST') return await decide(request, db, decision[1], actor);
    return json({ error: 'REVIEW_ACTION_DENIED', ...permissions }, 403);
  } catch (error) { return json({ error: error instanceof ReviewError ? error.message : 'REVIEW_UNAVAILABLE', ...permissions }, error instanceof ReviewError ? error.status : 503); }
}
export async function handleContentOwnerReviewAdmin(request, env) {
  const path = new URL(request.url).pathname;
  if (path !== OWNER_REVIEW_BASE && !path.startsWith(OWNER_REVIEW_BASE + '/')) return null;
  if (!(await verifyAdminToken(request, env)).ok) return json({ error: 'Unauthorized' }, 401);
  return handleContentOwnerReviewRoute(request, env, path.slice(OWNER_REVIEW_BASE.length), 'owner-admin');
}
