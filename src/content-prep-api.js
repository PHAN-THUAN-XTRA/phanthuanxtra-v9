import { verifyAdminToken } from './admin-auth.js';
import { issueContentPrepToken, verifyContentPrepToken, validPipeline } from './content-prep-auth.js';
import { CONTENT_PREP_BASE as BASE, CONTENT_PREP_ADMIN as ADMIN, contentPrepContract } from './content-prep-contract.js';
import { fleetEnabled } from './agent-fleet.js';
import { boundedBytes, PublishingError } from './publishing-api.js';
import { ImagePrivacyError, requirePrivateCover } from './gemini-plate-privacy.js';
import { validateArticle, vietnamSchedule, publicationKey } from './editorial-publishing.js';
import { getPost } from './post-persistence.js';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
class ContractError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const requestId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,100}$/.test(value);
async function readJson(request, allowed) {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new ContractError('Content-Type phải là application/json.', 415);
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 150 * 1024))); }
  catch (error) { if (error instanceof PublishingError) throw error; throw new ContractError('JSON không hợp lệ.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContractError('JSON object là bắt buộc.');
  if (Object.keys(value).some(k => !allowed.includes(k))) throw new ContractError('Trường ngoài execution contract bị từ chối.');
  return value;
}
const revisionFields = post => [post.title, post.slug, post.excerpt, post.content, post.cover_image, post.category, post.tags_json];
export const draftRevision = post => publicationKey(JSON.stringify(revisionFields(post)));
const requestKey = (pipeline, id) => publicationKey(JSON.stringify([pipeline, id]));
async function requestRow(db, key) { return db.prepare('SELECT * FROM xtra_content_prep_requests WHERE request_key=?').bind(key).first(); }
function samePayload(row, fingerprint, action) {
  if (row && (row.payload_fingerprint !== fingerprint || row.action !== action)) throw new ContractError('request_id đã được dùng cho payload hoặc action khác.', 409);
}
async function result(db, row, duplicate = true) {
  if (!row || row.status !== 'completed') throw new ContractError('Chưa có kết quả hoàn chỉnh; retry với cùng request_id.', 409);
  const post = row.post_id ? await getPost(db, row.post_id) : null;
  const currentRevision = post ? await draftRevision(post) : null;
  return {
    ok: true, duplicate, request_id: row.request_id, action: row.action, agent_id: row.agent_id,
    pipeline_id: row.pipeline_id, post_id: row.post_id, post,
    draft_revision: row.draft_revision, current_revision: currentRevision,
    artifact_available: !!post, requires_owner_approval: true, publicPublish: false, autoPublish: false,
    ...(row.action === 'prepare-schedule' ? { proposal: {
      state: row.review_state, scheduled_at: row.proposed_at, timezone: 'Asia/Ho_Chi_Minh',
      stale: !post || post.status !== 'draft' || currentRevision !== row.draft_revision || Date.parse(row.proposed_at) <= Date.now()
    } } : {})
  };
}
function auditStatement(db, key, action) {
  return db.prepare(`INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
    SELECT agent_id,?,'content-prep',request_key,action || ': ' || pipeline_id || '/' || request_id
    FROM xtra_content_prep_requests WHERE request_key=? AND status='claimed' AND post_id IS NOT NULL`).bind(action, key);
}
function completeStatement(db, key) {
  return db.prepare("UPDATE xtra_content_prep_requests SET status='completed',completed_at=CURRENT_TIMESTAMP WHERE request_key=? AND status='claimed' AND post_id IS NOT NULL").bind(key);
}

async function createDraft(request, env, db, claims) {
  const body = await readJson(request, ['request_id', 'title', 'content', 'excerpt', 'category', 'tags', 'cover_image']);
  if (!requestId(body.request_id)) throw new ContractError('request_id cần 16–100 ký tự chữ, số, _ hoặc -.');
  if (body.tags != null && (!Array.isArray(body.tags) || body.tags.length > 30 || body.tags.some(t => typeof t !== 'string' || t.length > 80))) throw new ContractError('tags không hợp lệ.');
  let parsed;
  try { parsed = validateArticle({ ...body, mode: 'draft' }, Date.now()); }
  catch (error) { throw new ContractError(error.message); }
  const key = await requestKey(claims.pipeline_id, body.request_id);
  const slug = `agent-draft-${key}`;
  const payload = JSON.stringify([parsed.title, parsed.content, parsed.excerpt, parsed.category, parsed.tags, parsed.cover_image]);
  const fingerprint = await publicationKey(payload);
  const prior = await requestRow(db, key);
  samePayload(prior, fingerprint, claims.action);
  if (prior) return json(await result(db, prior));
  if (parsed.cover_image && !await env.MEDIA?.head(parsed.cover_image.slice(7))) throw new ContractError('Ảnh cover chưa được lưu.', 422);
  await requirePrivateCover(env, parsed.cover_image);
  const revision = await draftRevision({ ...parsed, slug, tags_json: JSON.stringify(parsed.tags) });
  // Claim, artifact, evidence and completion commit together. Failure cannot strand a claim.
  const writes = await db.batch([
    db.prepare(`INSERT INTO xtra_content_prep_requests
      (request_key,pipeline_id,request_id,agent_id,action,payload_fingerprint,payload_json,draft_revision)
      VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING`)
      .bind(key, claims.pipeline_id, body.request_id, claims.agent_id, claims.action, fingerprint, payload, revision),
    db.prepare(`INSERT INTO posts (title,slug,excerpt,content,cover_image,category,tags_json,status)
      SELECT ?,?,?,?,?,?,?,'draft' FROM xtra_content_prep_requests
      WHERE request_key=? AND payload_fingerprint=? AND action='create-draft' AND status='claimed' AND post_id IS NULL`)
      .bind(parsed.title, slug, parsed.excerpt, parsed.content, parsed.cover_image, parsed.category, JSON.stringify(parsed.tags), key, fingerprint),
    db.prepare(`UPDATE xtra_content_prep_requests SET post_id=(SELECT id FROM posts WHERE slug=?)
      WHERE request_key=? AND payload_fingerprint=? AND action='create-draft' AND status='claimed' AND post_id IS NULL`).bind(slug, key, fingerprint),
    auditStatement(db, key, 'create-private-draft'), completeStatement(db, key)
  ]);
  const saved = await requestRow(db, key);
  samePayload(saved, fingerprint, claims.action);
  const duplicate = !Number(writes[0]?.meta?.changes);
  return json(await result(db, saved, duplicate), duplicate ? 200 : 201);
}

async function prepareSchedule(request, db, claims) {
  const body = await readJson(request, ['request_id', 'post_id', 'draft_revision', 'schedule']);
  if (!requestId(body.request_id) || !Number.isSafeInteger(body.post_id) || body.post_id <= 0 || !/^[a-f0-9]{64}$/.test(body.draft_revision || '')) throw new ContractError('request_id, post_id hoặc draft_revision không hợp lệ.');
  let due;
  try { due = vietnamSchedule(body.schedule, 0); } catch (error) { throw new ContractError(error.message); }
  const key = await requestKey(claims.pipeline_id, body.request_id);
  const payload = JSON.stringify([body.post_id, body.draft_revision, due]);
  const fingerprint = await publicationKey(payload);
  const prior = await requestRow(db, key);
  samePayload(prior, fingerprint, claims.action);
  // Replays still reconcile after the proposed time has passed.
  if (prior) return json(await result(db, prior));
  if (Date.parse(due) <= Date.now()) throw new ContractError('Giờ đề xuất phải ở tương lai.');
  const post = await db.prepare(`SELECT p.* FROM posts p JOIN xtra_content_prep_requests r ON r.post_id=p.id
    WHERE p.id=? AND r.pipeline_id=? AND r.action='create-draft' AND r.status='completed'`).bind(body.post_id, claims.pipeline_id).first();
  if (!post) throw new ContractError('Không tìm thấy draft trong pipeline này.', 404);
  if (post.status !== 'draft' || await draftRevision(post) !== body.draft_revision) throw new ContractError('Draft đã thay đổi; tải lại trước khi chuẩn bị lịch.', 409);
  const writes = await db.batch([
    // Recheck every revision field inside the transaction to close owner-edit races.
    db.prepare(`INSERT INTO xtra_content_prep_requests
      (request_key,pipeline_id,request_id,agent_id,action,payload_fingerprint,payload_json,post_id,draft_revision,proposed_at,review_state)
      SELECT ?,?,?,?,?,?,?,p.id,?,?,'proposed' FROM posts p WHERE p.id=? AND p.status='draft'
      AND p.title IS ? AND p.slug IS ? AND p.excerpt IS ? AND p.content IS ? AND p.cover_image IS ? AND p.category IS ? AND p.tags_json IS ?
      AND EXISTS(SELECT 1 FROM xtra_content_prep_requests r WHERE r.post_id=p.id AND r.pipeline_id=? AND r.action='create-draft' AND r.status='completed')
      ON CONFLICT(request_key) DO NOTHING`)
      .bind(key, claims.pipeline_id, body.request_id, claims.agent_id, claims.action, fingerprint, payload, body.draft_revision, due, body.post_id, ...revisionFields(post), claims.pipeline_id),
    auditStatement(db, key, 'prepare-schedule-proposal'), completeStatement(db, key)
  ]);
  const saved = await requestRow(db, key);
  if (!saved) throw new ContractError('Draft đã thay đổi trong lúc xử lý; tải lại.', 409);
  samePayload(saved, fingerprint, claims.action);
  const duplicate = !Number(writes[0]?.meta?.changes);
  return json(await result(db, saved, duplicate), duplicate ? 200 : 201);
}

export async function handleContentPrepApi(request, env) {
  const url = new URL(request.url), path = url.pathname;
  const ownerRoute = path === ADMIN || path.startsWith(ADMIN + '/');
  if (!ownerRoute && path !== BASE && !path.startsWith(BASE + '/')) return null;
  try {
    const claims = ownerRoute ? null : await verifyContentPrepToken(request, env);
    if (ownerRoute ? !(await verifyAdminToken(request, env)).ok : !claims) return json({ error: 'Unauthorized' }, 401);
    if (!fleetEnabled(env) && !(ownerRoute && request.method === 'GET')) return json({ error: 'AI Agent Fleet disabled' }, 503);
    if (!env.DB) return json({ error: 'D1 unavailable' }, 503);
    const db = env.DB.withSession?.('first-primary') || env.DB;
    if (ownerRoute) {
      if (path === ADMIN + '/credentials' && request.method === 'POST') {
        const body = await readJson(request, ['agent_id', 'pipeline_id', 'ttl_seconds']);
        let credential;
        try { credential = await issueContentPrepToken(env, body); } catch { throw new ContractError('Credential scope không hợp lệ.'); }
        await db.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES ('owner','issue-content-prep-credential','content-prep',?,?)")
          .bind(body.pipeline_id, `${credential.agent_id}: ${credential.action}; expires=${credential.expires_at}`).run();
        return json({ ok: true, ...credential, publicPublish: false }, 201);
      }
      if (path === ADMIN && request.method === 'GET') {
        const pipeline = url.searchParams.get('pipeline_id');
        if (!validPipeline(pipeline)) throw new ContractError('pipeline_id là bắt buộc.');
        const rows = (await db.prepare(`SELECT request_id,agent_id,action,post_id,draft_revision,proposed_at,review_state,status,created_at,completed_at
          FROM xtra_content_prep_requests WHERE pipeline_id=? ORDER BY created_at DESC,request_key LIMIT 100`).bind(pipeline).all()).results || [];
        return json({ ok: true, pipeline_id: pipeline, requests: rows, contract: contentPrepContract() });
      }
      return json({ error: 'Not Found' }, 404);
    }
    if (path === BASE + '/contract' && request.method === 'GET') return json({ ok: true, ...contentPrepContract(), scope: { agent_id: claims.agent_id, action: claims.action, pipeline_id: claims.pipeline_id } });
    const reconciliation = path.match(/^\/api\/agents\/content\/v1\/requests\/([A-Za-z0-9_-]{16,100})$/);
    if (reconciliation && request.method === 'GET') {
      const row = await requestRow(db, await requestKey(claims.pipeline_id, reconciliation[1]));
      return row ? json(await result(db, row)) : json({ error: 'Not Found' }, 404);
    }
    const draft = path.match(/^\/api\/agents\/content\/v1\/drafts\/(\d+)$/);
    if (draft && request.method === 'GET') {
      const row = await db.prepare("SELECT * FROM xtra_content_prep_requests WHERE pipeline_id=? AND post_id=? AND action='create-draft' AND status='completed'")
        .bind(claims.pipeline_id, Number(draft[1])).first();
      return row ? json(await result(db, row)) : json({ error: 'Not Found' }, 404);
    }
    if (path === BASE + '/drafts' && request.method === 'POST' && claims.action === 'create-draft') return await createDraft(request, env, db, claims);
    if (path === BASE + '/schedule-proposals' && request.method === 'POST' && claims.action === 'prepare-schedule') return await prepareSchedule(request, db, claims);
    return json({ error: 'Action outside execution contract', publicPublish: false }, 403);
  } catch (error) {
    if (error instanceof ContractError || error instanceof PublishingError || error instanceof ImagePrivacyError) return json({ error: error.message }, error.status);
    console.error('content_prep_failed', error?.name || 'Error');
    return json({ error: 'Chưa hoàn tất. Retry hoặc GET requests/{request_id} với cùng credential pipeline.', retry: true }, 503);
  }
}
