import { normalizePostPayload, slugify } from './post-persistence.js';

export const MAX_BATCH = 20;
export function vietnamSchedule(value, now = Date.now()) {
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/);
  if (!match) throw new Error('Giờ hẹn phải có dạng YYYY-MM-DD HH:mm (giờ Việt Nam).');
  const local = `${match[1]}T${match[2]}:00`;
  const ms = Date.parse(`${local}+07:00`);
  if (!Number.isFinite(ms) || new Date(ms + 7 * 3600000).toISOString().slice(0, 19) !== local)
    throw new Error('Ngày hoặc giờ hẹn không hợp lệ.');
  if (ms <= now) throw new Error('Giờ hẹn phải ở tương lai.');
  return new Date(ms).toISOString();
}
export const localTime = value => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short'
}).format(new Date(value));
export const publicationKey = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');

export function parseArticle(body, mode = 'publish') {
  const lines = String(body).trim().split(/\r?\n/);
  let schedule;
  if (mode === 'schedule') schedule = lines.shift()?.trim();
  const title = lines.shift()?.trim();
  const content = lines.join('\n').trim();
  if (!title || !content) throw new Error('Cần tiêu đề và nội dung trên các dòng riêng. Với /schedule, dòng đầu là YYYY-MM-DD HH:mm.');
  return { title, content, mode, schedule };
}
export function parseBatch(body) {
  const text = String(body).trim();
  let items;
  if (text.startsWith('[')) {
    try { items = JSON.parse(text); } catch { throw new Error('JSON danh sách bài không hợp lệ.'); }
  } else {
    items = text.split(/\r?\n---\r?\n/).map(block => {
      const match = block.trim().match(/^\/(post|draft|schedule)\s+([\s\S]+)$/i);
      if (!match) throw new Error('Mỗi bài bắt đầu bằng /post, /draft hoặc /schedule; ngăn cách bằng dòng --- .');
      return parseArticle(match[2], { post: 'publish', draft: 'draft', schedule: 'schedule' }[match[1].toLowerCase()]);
    });
  }
  if (!Array.isArray(items) || !items.length || items.length > MAX_BATCH)
    throw new Error(`Mỗi lô cần từ 1 đến ${MAX_BATCH} bài.`);
  return items;
}
export function validateArticle(item, now) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Bài viết không hợp lệ.');
  const mode = item.mode || 'draft';
  if (!['draft', 'publish', 'schedule'].includes(mode)) throw new Error('mode phải là draft, publish hoặc schedule.');
  for (const [key, max] of [['title',240],['content',100000],['excerpt',800],['category',100]]) {
    if (item[key] != null && (typeof item[key] !== 'string' || item[key].length > max)) throw new Error(`${key} không hợp lệ hoặc vượt ${max} ký tự.`);
  }
  if (item.cover_image && (!/^\/media\/[A-Za-z0-9/_\-.]+$/.test(item.cover_image) || item.cover_image.includes('..')))
    throw new Error('Ảnh cover phải là đường dẫn /media/ đã lưu trên website.');
  const parsed = normalizePostPayload({ ...item, slug: 'validated-post', status: 'draft', category: item.category || 'Tin tức' });
  if (parsed.error) throw new Error(parsed.error);
  return { ...parsed.value, mode, due: mode === 'schedule' ? vietnamSchedule(item.schedule, now) : mode === 'publish' ? new Date(now).toISOString() : null };
}
export async function publicationResults(db, chatId, requestKey) {
  return (await db.prepare(`SELECT j.*,p.title,p.slug,p.status AS post_status FROM editorial_jobs j
    JOIN posts p ON p.id=j.post_id WHERE j.chat_id=? AND j.request_key LIKE ? ORDER BY j.id`)
    .bind(String(chatId), `${requestKey}:%`).all()).results || [];
}
export async function submitArticles(db, items, { chatId, messageId, submissionId, now = Date.now() }) {
  if (submissionId != null && !/^[a-zA-Z0-9_-]{16,100}$/.test(submissionId)) throw new Error('Mã yêu cầu không hợp lệ.');
  if (submissionId == null && (!Number.isSafeInteger(Number(messageId)) || Number(messageId) <= 0)) throw new Error('Thiếu mã tin nhắn Telegram.');
  const requestKey = await publicationKey(`${chatId}:${submissionId ?? messageId}`);
  const existing = await publicationResults(db, chatId, requestKey);
  if (existing.length) return { duplicate: true, requestKey, jobs: existing };
  if (!Array.isArray(items) || !items.length || items.length > MAX_BATCH) throw new Error(`Tối đa ${MAX_BATCH} bài mỗi lô.`);
  // Validate the entire batch before any write. A failed item never leaves a partial batch.
  const parsed = items.map((item, index) => {
    try { return validateArticle(item, now); } catch (error) { throw new Error(`Bài ${index + 1}: ${error.message}`); }
  });
  const statements = [];
  for (const [index, item] of parsed.entries()) {
    const key = `${requestKey}:${index}`;
    const slug = `${slugify(item.title).slice(0, 65) || 'bai-viet'}-${requestKey.slice(0, 32)}-${index + 1}`;
    statements.push(db.prepare(`INSERT INTO posts (title,slug,excerpt,content,cover_image,category,tags_json,status)
      SELECT ?,?,?,?,?,?,?,'draft' WHERE NOT EXISTS (SELECT 1 FROM editorial_jobs WHERE request_key=?)`)
      .bind(item.title,slug,item.excerpt,item.content,item.cover_image,item.category,JSON.stringify(item.tags),key));
    statements.push(db.prepare(`INSERT INTO editorial_jobs (request_key,post_id,chat_id,status,scheduled_at)
      SELECT ?,id,?,?,? FROM posts WHERE slug=? ON CONFLICT(request_key) DO NOTHING`)
      .bind(key,String(chatId),item.mode === 'draft' ? 'draft' : 'pending',item.due,slug));
    statements.push(db.prepare(`INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
      SELECT 'telegram-editorial','create','post',CAST(id AS TEXT),? FROM posts WHERE slug=?
      AND NOT EXISTS (SELECT 1 FROM cms_audit_log WHERE actor='telegram-editorial' AND action='create' AND resource='post' AND resource_id=CAST(posts.id AS TEXT))`)
      .bind(`${item.mode}: ${item.title}`,slug));
  }
  await db.batch(statements);
  return { duplicate: false, requestKey, jobs: await publicationResults(db, chatId, requestKey) };
}
// No external side effect in the transaction. Concurrent cron/webhook retries cannot republish.
export async function publishDueArticles(env, { now = Date.now(), chatId = null, requestKey = null } = {}) {
  if (!env.DB) return { published: 0 };
  const db = env.DB, iso = new Date(now).toISOString();
  let sql = "SELECT id FROM editorial_jobs WHERE status='pending' AND scheduled_at<=?", args = [iso];
  if (chatId !== null) { sql += ' AND chat_id=?'; args.push(String(chatId)); }
  if (requestKey !== null) { sql += ' AND request_key LIKE ?'; args.push(`${requestKey}:%`); }
  const rows = (await db.prepare(sql + ' ORDER BY scheduled_at,id LIMIT 20').bind(...args).all()).results || [];
  let published = 0;
  for (const { id } of rows) {
    const results = await db.batch([
      db.prepare(`UPDATE posts SET status='published',published_at=?,updated_at=CURRENT_TIMESTAMP
        WHERE status='draft' AND id=(SELECT post_id FROM editorial_jobs WHERE id=? AND status='pending' AND scheduled_at<=?)`).bind(iso,id,iso),
      db.prepare(`INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
        SELECT 'telegram-editorial','publish','post',CAST(p.id AS TEXT),p.title FROM posts p JOIN editorial_jobs j ON j.post_id=p.id
        WHERE j.id=? AND j.status='pending' AND j.scheduled_at<=? AND p.status='published'`).bind(id,iso),
      db.prepare(`UPDATE editorial_jobs SET status=CASE WHEN EXISTS(SELECT 1 FROM posts WHERE id=post_id AND status='published')
        THEN 'published' ELSE 'cancelled' END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending' AND scheduled_at<=?`).bind(id,iso)
    ]);
    published += Number(results[0]?.meta?.changes || 0);
  }
  return { published };
}
export async function changePublication(db, chatId, id, action, now = Date.now()) {
  if (!/^\d+$/.test(String(id))) throw new Error('Mã bài không hợp lệ. Gõ /posts để xem mã.');
  const sql = action === 'publish'
    ? "UPDATE editorial_jobs SET status='pending',scheduled_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND chat_id=? AND status='draft'"
    : "UPDATE editorial_jobs SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND chat_id=? AND status IN ('draft','pending')";
  const args = action === 'publish' ? [new Date(now).toISOString(),Number(id),String(chatId)] : [Number(id),String(chatId)];
  await db.prepare(sql).bind(...args).run();
  return (await db.prepare(`SELECT j.*,p.title,p.slug,p.status AS post_status FROM editorial_jobs j JOIN posts p ON p.id=j.post_id WHERE j.id=? AND j.chat_id=?`)
    .bind(Number(id),String(chatId)).first());
}
export async function getPublication(db, chatId, id) {
  return db.prepare(`SELECT j.*,p.title,p.slug,p.status AS post_status FROM editorial_jobs j JOIN posts p ON p.id=j.post_id
    WHERE j.id=? AND j.chat_id=?`).bind(Number(id),String(chatId)).first();
}
export async function recentPublications(db, chatId) {
  return (await db.prepare(`SELECT j.*,p.title,p.slug,p.status AS post_status FROM editorial_jobs j JOIN posts p ON p.id=j.post_id
    WHERE j.chat_id=? ORDER BY j.id DESC LIMIT 20`).bind(String(chatId)).all()).results || [];
}
