import { analyzeVehicleImage } from "./vehicle-ai.js";
import { createPtXtraPlateImage } from "./plate-branding.js";
import { canAutoPublish, promoteDraft } from "./telegram-ingest.js";
import { savePost } from "./post-persistence.js";
import { getPost } from "./post-persistence.js";
import { answerAutoCustomer, autoBlogSlug, canPublishAutoBlog, createBlogPost, generateVehicleBlog, isAutoChat, parseAutoCommand } from "./auto-bot-ai.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (v, n = 4000) => String(v ?? "").trim().slice(0, n);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = async value => { const bytes = new TextEncoder().encode(value); const hash = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join(""); };
const autoBotToken = env => env.TELEGRAM_AUTO_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
const AUTO_WEBHOOK_URL = "https://phanthuanxtra.com/api/telegram/webhook";
async function tg(token, method, payload = {}) { if (!token) throw new Error("Telegram Auto Bot token is not configured"); const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(clean(data.description || `Telegram ${method} failed`)); return data.result; }
const pickPhoto = message => Array.isArray(message?.photo) && message.photo.length ? message.photo[message.photo.length - 1] : null;
export const telegramWebhookReceipt = hasPhoto => hasPhoto ? "📥 ĐÃ NHẬN ẢNH XE\n⏳ Đang kiểm tra và xử lý..." : "📥 ĐÃ NHẬN THÔNG TIN XE\n⏳ Đang chờ ảnh xe để xử lý...";

async function processBundle(env, bundleKey, chatId) {
  const token = autoBotToken(env);
  const claim = await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='processing',updated_at=CURRENT_TIMESTAMP WHERE bundle_key=? AND bundle_status='pending'").bind(bundleKey).run();
  if (Number(claim?.meta?.changes || 0) < 1) return;
  const rows = (await env.DB.prepare("SELECT * FROM telegram_inbox WHERE bundle_key=? ORDER BY id ASC").bind(bundleKey).all()).results || [];
  const photoRows = rows.filter(row => row.file_id);
  const photoRow = photoRows[0];
  if (!photoRow) return;
  const text = rows.map(row => clean(row.caption)).filter(Boolean).join("\n\n");
  try {
    const processed = [];
    let primaryAi = null;
    for (let index = 0; index < photoRows.length; index++) {
      const row = photoRows[index];
      const file = await tg(token, "getFile", { file_id: row.file_id });
      const filePath = clean(file?.file_path, 1000);
      if (!filePath) throw new Error("Telegram did not return file_path");
      const image = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
      if (!image.ok) throw new Error(`Telegram file download failed: ${image.status}`);
      const bytes = await image.arrayBuffer();
      const contentType = image.headers.get("content-type") || "image/jpeg";
      const ai = await analyzeVehicleImage(env, bytes, contentType, text);
      if (!primaryAi || Number(ai?.confidence || 0) > Number(primaryAi?.confidence || 0)) primaryAi = ai;
      const sourceHash = await sha256(`${chatId}:${row.message_id}:${row.file_unique_id || row.file_id || bundleKey}`);
      const publishMediaKey = `vehicles/publish-inbox-${photoRow.id}-${String(index + 1).padStart(2, "0")}-${sourceHash.slice(0, 12)}.webp`;
      const plate = ai?.plate_bbox;
      const hasPlate = Boolean(plate && Number(plate.width) > 0 && Number(plate.height) > 0);
      if (hasPlate) {
        await createPtXtraPlateImage(env, bytes, contentType, plate, publishMediaKey, "image/webp");
      } else {
        if (!env.IMAGES) throw new Error("IMAGES binding is not configured");
        const result = await env.IMAGES.input(bytes).output({ format: "image/webp", quality: 88, metadata: "none" });
        const response = result.response({ headers: { "cache-control": "public, max-age=31536000, immutable" } });
        if (!response.ok || !response.body) throw new Error(`PT Xtra WebP transform failed: ${response.status}`);
        await env.MEDIA.put(publishMediaKey, response.body, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { branding: "none", format: "webp" } });
      }
      processed.push({ row, ai, publishMediaKey, hasPlate, filePath });
      await env.DB.prepare("UPDATE telegram_inbox SET status='analyzed',processed_image_url=?,file_path=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(`/media/${publishMediaKey}`, filePath, Number(row.id)).run();
    }
    const ai = primaryAi || {};
    const inboxId = Number(photoRow.id);
    const publishMediaKeys = processed.map(item => item.publishMediaKey);
    await env.DB.prepare(`INSERT INTO vehicle_ai_drafts (inbox_id,status,ai_json,confidence,missing_fields_json,source_caption,source_file_path,created_at,updated_at) VALUES (?, 'draft', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(inbox_id) DO UPDATE SET ai_json=excluded.ai_json,confidence=excluded.confidence,missing_fields_json=excluded.missing_fields_json,source_caption=excluded.source_caption,source_file_path=excluded.source_file_path,error=NULL,status='draft',updated_at=CURRENT_TIMESTAMP`).bind(inboxId, JSON.stringify({ ...ai, publish_media_key: publishMediaKeys[0], publish_media_keys: publishMediaKeys, bundle_key: bundleKey, image_count: publishMediaKeys.length }), Number(ai.confidence || 0), JSON.stringify(ai.missing_fields || []), text, processed[0]?.filePath || "").run();
    const label = [ai.brand, ai.model].filter(Boolean).join(" ") || "Chưa xác định tên xe";
    if (!canAutoPublish(ai)) {
      await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='done',caption=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(text, bundleKey).run();
      await env.DB.prepare("UPDATE vehicle_ai_drafts SET status='awaiting_review',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?").bind(inboxId).run();
      await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(photoRow.message_id || 0), text: ["⚠️ ĐÃ PHÂN TÍCH XE — CHƯA TỰ ĐĂNG", `📦 Inbox: ${inboxId}`, `🚗 Xe: ${label}`, `🖼 Đã xử lý WebP: ${publishMediaKeys.length} ảnh`, "⏳ Xe thật đã được lưu làm bản nháp, không tạo dữ liệu giả."].join("\n") });
      return;
    }
    await env.DB.prepare("UPDATE vehicle_ai_drafts SET status='ready_to_publish',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?").bind(inboxId).run();
    const promotion = await promoteDraft(env, inboxId, ai, publishMediaKeys[0], publishMediaKeys);
    if (!promotion?.published) throw new Error(promotion?.reason || "Vehicle publication gate rejected the listing");
    await env.DB.prepare("UPDATE telegram_inbox SET status='published',bundle_status='published',caption=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(text, bundleKey).run();
    const brandedCount = processed.filter(item => item.hasPlate).length;
    await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(photoRow.message_id || 0), text: ["🚀 ĐÃ PHÂN TÍCH + TỰ ĐĂNG XE", `📦 Inbox: ${inboxId}`, `🚗 Xe: ${label}`, `🖼 WebP: ${publishMediaKeys.length}/${photoRows.length} ảnh`, `🪪 Che/thay biển số: ${brandedCount} ảnh`, "🌐 Website: phanthuanxtra.com", "✅ Toàn bộ ảnh publish đã được tạo trong R2 trước khi tạo bản ghi website."].join("\n") });
  } catch (error) {
    const message = clean(error?.message || error);
    await env.DB.prepare("UPDATE telegram_inbox SET status='failed',bundle_status='failed',error=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(message, bundleKey).run().catch(() => {});
    await tg(token, "sendMessage", { chat_id: chatId, text: `❌ Không xử lý được gói ảnh + thông tin\n📦 Bundle: ${bundleKey}\n⚠️ ${message}` }).catch(() => {});
  }
}

function blogCommand(caption){const raw=clean(caption,12000);if(!/^\/(blog|news)\b/i.test(raw))return null;const body=raw.replace(/^\/(blog|news)\b/i,"").trim();if(!body)return null;const lines=body.split(/\r?\n/).map(x=>x.trim());const title=clean(lines.shift(),240);const content=clean(lines.join("\n"),100000);return title&&content?{title,content,excerpt:clean(content,500),category:"Tin tức",status:"published"}:null}
async function publishTelegramBlog(env,message,chatId){const token=autoBotToken(env),draft=blogCommand(message?.caption||message?.text);if(!draft)return false;const photo=pickPhoto(message);if(photo){const file=await tg(token,"getFile",{file_id:photo.file_id});const path=clean(file?.file_path,1000);const image=await fetch(`https://api.telegram.org/file/bot${token}/${path}`);if(!image.ok)throw new Error(`Telegram blog image download failed: ${image.status}`);const bytes=await image.arrayBuffer(),type=image.headers.get("content-type")||"image/jpeg",ext=type.includes("png")?"png":type.includes("webp")?"webp":"jpg",key=`blog/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:"public,max-age=31536000,immutable"}});draft.cover_image=`/media/${key}`}
 const saved=await savePost(env.DB,draft,{mode:"create",actor:"telegram-auto-bot"});if(!saved.ok)throw new Error(saved.error);await tg(token,"sendMessage",{chat_id:chatId,reply_to_message_id:Number(message.message_id||0),text:`📰 ĐÃ ĐĂNG BÀI WEBSITE\n${saved.post.title}\n🌐 https://phanthuanxtra.com/blog/${saved.post.slug}`});return true}

async function publishAiPhotoBlog(env, message, chatId, caption) {
  if (!env.DB || !env.MEDIA) throw new Error("Chưa cấu hình nơi lưu bài và ảnh.");
  const token = autoBotToken(env);
  const slug = await autoBlogSlug(chatId, message.message_id);
  let post = await getPost(env.DB, slug);
  if (!post) {
    const photo = pickPhoto(message);
    const file = await tg(token, "getFile", { file_id: photo.file_id });
    if (!file?.file_path) throw new Error("Không tải được ảnh Telegram.");
    const image = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!image.ok) throw new Error("Không tải được ảnh Telegram.");
    const bytes = await image.arrayBuffer();
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Vui lòng gửi ảnh nhỏ hơn 10 MB.");
    const type = image.headers.get("content-type") || "image/jpeg";
    const generated = await generateVehicleBlog(env, bytes, type, caption);
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const key = `blog/${slug}.${extension}`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type, cacheControl: "public,max-age=31536000,immutable" } });
    ({ post } = await createBlogPost(env, generated.draft, { chatId, slug, coverImage: `/media/${key}` }));
    console.log("telegram_auto_blog_created", { model: generated.model, vision_model: generated.visionModel });
  }
  await tg(token, "sendMessage", { chat_id: chatId, text: `📰 BÀI BLOG\n${post.title}\nhttps://phanthuanxtra.com/blog/${post.slug}` });
}

export async function processTelegramUpdate(env, update, chatId) {
  const token = autoBotToken(env);
  const message = update?.message || update?.channel_post;
  if (!message?.chat?.id) return;
  const photo = pickPhoto(message);
  const caption = clean(message.caption || message.text);
  const command = parseAutoCommand(caption);
  if (["start", "help"].includes(command?.name)) {
    await tg(token, "sendMessage", { chat_id: chatId, text: "PHAN THUẦN XTRA AUTO\n/chat <câu hỏi> — tư vấn xe\nẢnh + /blog <ghi chú> — AI phân tích và đăng Blog (chat được cấp quyền)\n/blog <tiêu đề>\\n<nội dung> — đăng bài đã soạn\nẢnh + thông tin xe — nhập xe theo luồng hiện tại." });
    return;
  }
  if (["blog", "news"].includes(command?.name)) {
    if (!canPublishAutoBlog(env, chatId)) {
      await tg(token, "sendMessage", { chat_id: chatId, text: "Chat này chưa được cấp quyền đăng Blog. Bạn có thể dùng /chat để được tư vấn." });
      return;
    }
    if (photo) { await publishAiPhotoBlog(env, message, chatId, command.body); return; }
    const normalized = { ...message, text: `/blog ${command.body}` };
    if (blogCommand(normalized.text)) { await publishTelegramBlog(env, normalized, chatId); return; }
    await tg(token, "sendMessage", { chat_id: chatId, text: "Gửi ảnh xe kèm /blog và ghi chú để AI tạo bài, hoặc /blog với tiêu đề và nội dung trên hai dòng." });
    return;
  }
  if (!photo && (command?.name === "chat" || isAutoChat(caption))) {
    if (command && !command.body) { await tg(token, "sendMessage", { chat_id: chatId, text: "Nhập /chat cùng câu hỏi về xe của bạn." }); return; }
    const result = await answerAutoCustomer(env, command?.body || caption);
    await tg(token, "sendMessage", { chat_id: chatId, text: result.answer });
    return;
  }
  if (command) {
    await tg(token, "sendMessage", { chat_id: chatId, text: "Gõ /help để xem các lệnh hỗ trợ." });
    return;
  }
  if (!photo && !caption) return;
  if (!env.DB || !env.MEDIA) {
    const reason = !env.DB && !env.MEDIA ? "D1/MEDIA" : !env.DB ? "D1" : "MEDIA";
    await tg(token, "sendMessage", { chat_id: chatId, text: `❌ Hệ thống thiếu binding ${reason}.\n⛔ Chưa phân tích/publish xe.` }).catch(error => console.error("telegram_binding_error_reply_failed", clean(error?.message || error)));
    return;
  }
  const sourceHash = await sha256(`${chatId}:${message.message_id}:${photo?.file_unique_id || caption}`);
  const isPhoto = Boolean(photo);
  const mediaGroupId = clean(message.media_group_id, 200);
  const recent = (await env.DB.prepare("SELECT id,bundle_key,file_id,caption,bundle_status FROM telegram_inbox WHERE chat_id=? AND bundle_status=\'pending\' AND created_at >= datetime(\'now\',\'-45 seconds\') ORDER BY id DESC LIMIT 50").bind(chatId).all()).results || [];
  // Telegram sends every album item as a separate update. Keep all items in one stable
  // media_group bundle; only use complementary pairing for non-album photo/text messages.
  const partner = mediaGroupId ? null : recent.find(row => {
    const rowHasPhoto = Boolean(row.file_id);
    const rowHasText = Boolean(clean(row.caption));
    return isPhoto ? (!rowHasPhoto && rowHasText) : (rowHasPhoto && !rowHasText);
  });
  const bundleKey = mediaGroupId ? `${chatId}:album:${mediaGroupId}` : (partner?.bundle_key || `${chatId}:${message.message_id}`);
  await env.DB.prepare("INSERT INTO telegram_inbox (source_hash,chat_id,message_id,file_id,file_unique_id,file_path,caption,status,bundle_key,bundle_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'received',?,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(source_hash) DO NOTHING").bind(sourceHash, chatId, Number(message.message_id || 0), photo?.file_id || "", photo?.file_unique_id || "", "", caption, bundleKey).run();
  const rows = (await env.DB.prepare("SELECT id,file_id,caption,bundle_status FROM telegram_inbox WHERE bundle_key=? ORDER BY id").bind(bundleKey).all()).results || [];
  const hasPhoto = rows.some(row => Boolean(row.file_id));
  const hasText = rows.some(row => clean(row.caption));
  if (hasPhoto && hasText) {
    await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(message.message_id || 0), text: "📥 ĐÃ GHÉP ẢNH + THÔNG TIN XE\n⏳ Đang phân tích AI và kiểm tra publish..." }).catch(() => {});
    await sleep(1200);
    const status = (await env.DB.prepare("SELECT bundle_status FROM telegram_inbox WHERE bundle_key=? LIMIT 1").bind(bundleKey).first())?.bundle_status;
    if (status === "pending") await processBundle(env, bundleKey, chatId);
  } else {
    await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(message.message_id || 0), text: photo ? "📥 Đã nhận ảnh. Chờ phần thông tin xe để ghép tự động." : "📥 Đã nhận thông tin. Chờ ảnh xe để ghép tự động." }).catch(() => {});
  }
}

async function autoWebhook(request, env, ctx) {
  const token = autoBotToken(env);
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret && request.headers.get("X-Telegram-Webhook-Secret") !== secret) return json({ error: "Unauthorized" }, 401);
  const update = await request.json().catch(() => null);
  const message = update?.message || update?.channel_post;
  if (!message?.chat?.id) return json({ ok: true, ignored: true });
  const photo = pickPhoto(message);
  const caption = clean(message.caption || message.text);
  if (!photo && !caption) return json({ ok: true, ignored: true });
  const chatId = String(message.chat.id);
  const receipt = parseAutoCommand(caption) || (!photo && isAutoChat(caption)) ? "📥 Đã nhận yêu cầu. Đang xử lý..." : telegramWebhookReceipt(Boolean(photo));
  try { await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(message.message_id || 0), text: receipt }); } catch (error) { console.error("telegram_receipt_failed", clean(error?.message || error)); }
  const task = processTelegramUpdate(env, update, chatId).catch(async () => {
    console.error("telegram_update_failed");
    await tg(token, "sendMessage", { chat_id: chatId, text: "Chưa xử lý được yêu cầu. Vui lòng thử lại sau; không gửi lại liên tục." }).catch(() => {});
  });
  if (ctx) ctx.waitUntil(task);
  else await task;
  return json({ ok: true, received: true, queued: Boolean(ctx) });
}

export async function getAutoTelegramWebhookStatus(env, expectedUrl = AUTO_WEBHOOK_URL) {
  const token = autoBotToken(env);
  if (!token) return { ok: false, error: "Telegram Auto Bot token is not configured" };
  try {
    const info = await tg(token, "getWebhookInfo", {});
    const actual = clean(info?.url, 2000);
    return { ok: true, configured: Boolean(actual), url_configured: Boolean(actual), url_matches_expected: actual === expectedUrl, expected_url: expectedUrl, pending_update_count: Number(info?.pending_update_count || 0), last_error_date: info?.last_error_date || null, last_error_message: clean(info?.last_error_message || "", 1000) || null };
  } catch (error) {
    return { ok: false, error: clean(error?.message || error, 1000) || "Telegram Auto Bot getWebhookInfo failed" };
  }
}

export async function setAutoTelegramWebhook(env, webhookUrl = AUTO_WEBHOOK_URL) {
  const token = autoBotToken(env);
  const payload = { url: webhookUrl, allowed_updates: ["message", "channel_post"] };
  if (env.TELEGRAM_WEBHOOK_SECRET) payload.secret_token = env.TELEGRAM_WEBHOOK_SECRET;
  return tg(token, "setWebhook", payload);
}

export async function handleTelegramRouter(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === "/api/telegram/webhook" && request.method === "POST") return autoWebhook(request, env, ctx);
  return null;
}
