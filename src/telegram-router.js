import { analyzeVehicleImage } from "./vehicle-ai.js";
import { createPtXtraPlateImage } from "./plate-branding.js";
import { canAutoPublish, promoteDraft } from "./telegram-ingest.js";
import { savePost } from "./post-persistence.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (v, n = 4000) => String(v ?? "").trim().slice(0, n);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = async value => { const bytes = new TextEncoder().encode(value); const hash = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join(""); };
const autoBotToken = env => env.TELEGRAM_AUTO_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
async function tg(token, method, payload = {}) { if (!token) throw new Error("Telegram Auto Bot token is not configured"); const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(clean(data.description || `Telegram ${method} failed`)); return data.result; }
const pickPhoto = message => Array.isArray(message?.photo) && message.photo.length ? message.photo[message.photo.length - 1] : null;
export const telegramWebhookReceipt = hasPhoto => hasPhoto ? "📥 ĐÃ NHẬN ẢNH XE\n⏳ Đang kiểm tra và xử lý..." : "📥 ĐÃ NHẬN THÔNG TIN XE\n⏳ Đang chờ ảnh xe để xử lý...";

async function processBundle(env, bundleKey, chatId) {
  const token = autoBotToken(env);
  const claim = await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='processing',updated_at=CURRENT_TIMESTAMP WHERE bundle_key=? AND bundle_status='pending'").bind(bundleKey).run();
  if (Number(claim?.meta?.changes || 0) !== 1) return;
  const rows = (await env.DB.prepare("SELECT * FROM telegram_inbox WHERE bundle_key=? ORDER BY id ASC").bind(bundleKey).all()).results || [];
  const photoRow = rows.find(row => row.file_id);
  if (!photoRow) return;
  const text = rows.map(row => clean(row.caption)).filter(Boolean).join("\n\n");
  try {
    const file = await tg(token, "getFile", { file_id: photoRow.file_id });
    const filePath = clean(file?.file_path, 1000);
    if (!filePath) throw new Error("Telegram did not return file_path");
    const image = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!image.ok) throw new Error(`Telegram file download failed: ${image.status}`);
    const bytes = await image.arrayBuffer();
    const contentType = image.headers.get("content-type") || "image/jpeg";
    const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const sourceHash = await sha256(`${chatId}:${photoRow.message_id}:${photoRow.file_unique_id || photoRow.file_id || bundleKey}`);
    const mediaKey = `vehicles/inbox-${photoRow.id}-${sourceHash.slice(0, 16)}.${extension}`;
    await env.MEDIA.put(mediaKey, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
    const ai = await analyzeVehicleImage(env, bytes, contentType, text);
    const inboxId = Number(photoRow.id);
    await env.DB.prepare(`INSERT INTO vehicle_ai_drafts (inbox_id,status,ai_json,confidence,missing_fields_json,source_caption,source_file_path,created_at,updated_at) VALUES (?, 'draft', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(inbox_id) DO UPDATE SET ai_json=excluded.ai_json,confidence=excluded.confidence,missing_fields_json=excluded.missing_fields_json,source_caption=excluded.source_caption,source_file_path=excluded.source_file_path,error=NULL,status='draft',updated_at=CURRENT_TIMESTAMP`).bind(inboxId, JSON.stringify({ ...ai, media_key: mediaKey, bundle_key: bundleKey }), Number(ai.confidence || 0), JSON.stringify(ai.missing_fields || []), text, filePath).run();
    await env.DB.prepare("UPDATE telegram_inbox SET status='analyzed',processed_image_url=?,bundle_status='done',caption=?,file_path=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(`/media/${mediaKey}`, text, filePath, bundleKey).run();
    const label = [ai.brand, ai.model].filter(Boolean).join(" ") || "Chưa xác định tên xe";
    if (!canAutoPublish(ai)) {
      await env.DB.prepare("UPDATE vehicle_ai_drafts SET status='awaiting_review',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?").bind(inboxId).run();
      await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(photoRow.message_id || 0), text: ["⚠️ ĐÃ PHÂN TÍCH XE — CHƯA TỰ ĐĂNG", `📦 Inbox: ${inboxId}`, `🚗 Xe: ${label}`, ai.year ? `📅 Năm: ${ai.year}` : null, ai.price != null ? `💰 Giá: ${ai.price}` : null, ai.mileage != null ? `🛣 ODO: ${ai.mileage}` : null, `🎯 AI: ${Math.round(Number(ai.confidence || 0) * 100)}%`, "🪪 Chưa đạt điều kiện xác định vùng biển số / độ tin cậy.", "⏳ Xe thật đã được lưu làm bản nháp, không tạo dữ liệu giả.", `🖼 /media/${mediaKey}`].filter(Boolean).join("\n") });
      return;
    }
    let publishMediaKey = mediaKey;
    const plate = ai?.plate_bbox;
    const hasPlate = Boolean(plate && Number(plate.width) > 0 && Number(plate.height) > 0);
    if (hasPlate) {
      publishMediaKey = `vehicles/publish-inbox-${inboxId}-${sourceHash.slice(0, 16)}.jpg`;
      await createPtXtraPlateImage(env, bytes, contentType, plate, publishMediaKey);
    }
    await env.DB.prepare(`UPDATE vehicle_ai_drafts SET ai_json=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?`).bind(JSON.stringify({ ...ai, media_key: mediaKey, publish_media_key: publishMediaKey, bundle_key: bundleKey, branding: hasPlate ? "PT Xtra" : "none", branding_target: hasPlate ? "license_plate" : null }), hasPlate ? "branded" : "ready_to_publish", inboxId).run();
    await env.DB.prepare("UPDATE telegram_inbox SET processed_image_url=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(`/media/${publishMediaKey}`, bundleKey).run();
    const promotion = await promoteDraft(env, inboxId, ai, publishMediaKey);
    if (!promotion?.published) throw new Error(promotion?.reason || "Vehicle publication gate rejected the listing");
    await env.DB.prepare("UPDATE telegram_inbox SET status='published',bundle_status='published',updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(bundleKey).run();
    await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(photoRow.message_id || 0), text: ["🚀 ĐÃ PHÂN TÍCH + TỰ ĐĂNG XE", `📦 Inbox: ${inboxId}`, `🚗 Xe: ${label}`, ai.year ? `📅 Năm: ${ai.year}` : null, ai.price != null ? `💰 Giá: ${ai.price}` : null, ai.mileage != null ? `🛣 ODO: ${ai.mileage}` : null, `🎯 AI: ${Math.round(Number(ai.confidence || 0) * 100)}%`, hasPlate ? "🪪 Biển số: đã thay bằng PT Xtra" : "🪪 Biển số: không phát hiện — giữ ảnh gốc", `🖼 Ảnh publish: /media/${publishMediaKey}`, "🌐 Website: phanthuanxtra.com", "✅ Bản ảnh publish đã được tạo trong R2 trước khi tạo bản ghi website."].filter(Boolean).join("\n") });
  } catch (error) {
    const message = clean(error?.message || error);
    await env.DB.prepare("UPDATE telegram_inbox SET status='failed',bundle_status='failed',error=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(message, bundleKey).run().catch(() => {});
    await tg(token, "sendMessage", { chat_id: chatId, text: `❌ Không xử lý được gói ảnh + thông tin\n📦 Bundle: ${bundleKey}\n⚠️ ${message}` }).catch(() => {});
  }
}

function blogCommand(caption){const raw=clean(caption,12000);if(!/^\/(blog|news)\b/i.test(raw))return null;const body=raw.replace(/^\/(blog|news)\b/i,"").trim();if(!body)return null;const lines=body.split(/\r?\n/).map(x=>x.trim());const title=clean(lines.shift(),240);const content=clean(lines.join("\n"),100000);return title&&content?{title,content,excerpt:clean(content,500),category:"Tin tức",status:"published"}:null}
async function publishTelegramBlog(env,message,chatId){const token=autoBotToken(env),draft=blogCommand(message?.caption||message?.text);if(!draft)return false;const photo=pickPhoto(message);if(photo){const file=await tg(token,"getFile",{file_id:photo.file_id});const path=clean(file?.file_path,1000);const image=await fetch(`https://api.telegram.org/file/bot${token}/${path}`);if(!image.ok)throw new Error(`Telegram blog image download failed: ${image.status}`);const bytes=await image.arrayBuffer(),type=image.headers.get("content-type")||"image/jpeg",ext=type.includes("png")?"png":type.includes("webp")?"webp":"jpg",key=`blog/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:"public,max-age=31536000,immutable"}});draft.cover_image=`/media/${key}`}
 const saved=await savePost(env.DB,draft,{mode:"create",actor:"telegram-auto-bot"});if(!saved.ok)throw new Error(saved.error);await tg(token,"sendMessage",{chat_id:chatId,reply_to_message_id:Number(message.message_id||0),text:`📰 ĐÃ ĐĂNG BÀI WEBSITE\n${saved.post.title}\n🌐 https://phanthuanxtra.com/blog/${saved.post.slug}`});return true}

async function processTelegramUpdate(env, update, chatId) {
  const token = autoBotToken(env);
  const message = update?.message || update?.channel_post;
  if (blogCommand(message?.caption || message?.text)) { await publishTelegramBlog(env, message, chatId); return; }
  if (!message?.chat?.id) return;
  const photo = pickPhoto(message);
  const caption = clean(message.caption || message.text);
  if (!photo && !caption) return;
  if (!env.DB || !env.MEDIA) {
    const reason = !env.DB && !env.MEDIA ? "D1/MEDIA" : !env.DB ? "D1" : "MEDIA";
    await tg(token, "sendMessage", { chat_id: chatId, text: `❌ Hệ thống thiếu binding ${reason}.\n⛔ Chưa phân tích/publish xe.` }).catch(error => console.error("telegram_binding_error_reply_failed", clean(error?.message || error)));
    return;
  }
  const sourceHash = await sha256(`${chatId}:${message.message_id}:${photo?.file_unique_id || caption}`);
  const isPhoto = Boolean(photo);
  const recent = (await env.DB.prepare("SELECT id,bundle_key,file_id,caption,bundle_status FROM telegram_inbox WHERE chat_id=? AND bundle_status='pending' AND created_at >= datetime('now','-45 seconds') ORDER BY id DESC LIMIT 20").bind(chatId).all()).results || [];
  // Pair only with the complementary half of an incomplete bundle. Ignore rows already
  // containing both photo + caption; otherwise a later text can attach to an older photo.
  const partner = recent.find(row => {
    const rowHasPhoto = Boolean(row.file_id);
    const rowHasText = Boolean(clean(row.caption));
    return isPhoto ? (!rowHasPhoto && rowHasText) : (rowHasPhoto && !rowHasText);
  });
  const bundleKey = partner?.bundle_key || `${chatId}:${message.message_id}`;
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
  try { await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(message.message_id || 0), text: telegramWebhookReceipt(Boolean(photo)) }); } catch (error) { console.error("telegram_receipt_failed", clean(error?.message || error)); }
  if (ctx) ctx.waitUntil(processTelegramUpdate(env, update, chatId).catch(error => console.error("telegram_update_failed", clean(error?.message || error))));
  else processTelegramUpdate(env, update, chatId).catch(error => console.error("telegram_update_failed", clean(error?.message || error)));
  return json({ ok: true, received: true, queued: Boolean(ctx) });
}

export async function handleTelegramRouter(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === "/api/telegram/webhook" && request.method === "POST") return autoWebhook(request, env, ctx);
  return null;
}
