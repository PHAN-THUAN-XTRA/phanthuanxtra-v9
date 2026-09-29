import { handleEditorialMessage, isEditorialMessage, EDITORIAL_HELP } from "./telegram-editorial.js";
import { analyzeVehicleImage } from "./vehicle-ai.js";
import { promoteDraft } from "./telegram-ingest.js";
import { savePost } from "./post-persistence.js";
import { getPost } from "./post-persistence.js";
import { answerAutoCustomer, autoBlogSlug, canPublishAutoBlog, createBlogPost, generateVehicleBlog, isAutoChat, parseAutoCommand } from "./auto-bot-ai.js";
import { boundedBytes, storePublishingImage } from "./publishing-api.js";
import { imageInputLimit } from "./media-policy.js";
import { storeTelegramVehicleVariants } from "./telegram-media-variants.js";

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
  const processed = [];
  try {
    let primaryAi = null;
    for (const row of photoRows) {
      const file = await tg(token, "getFile", { file_id: row.file_id });
      const filePath = clean(file?.file_path, 1000);
      if (!filePath) throw new Error("Telegram did not return file_path");
      const image = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
      if (!image.ok || !image.body) throw new Error(`Telegram file download failed: ${image.status}`);
      if (Number(image.headers.get("content-length") || 0) > imageInputLimit()) throw new Error("Ảnh vượt giới hạn 15 MB.");
      const bytes = await boundedBytes(image.body, imageInputLimit());
      const contentType = image.headers.get("content-type") || "image/jpeg";
      const ai = await analyzeVehicleImage(env, bytes, contentType, text);
      if (!primaryAi || Number(ai?.confidence || 0) > Number(primaryAi?.confidence || 0)) primaryAi = ai;
      // Telegram vehicle intake is format-only: no plate masking, watermark or other image editing.
      // Cloudflare Images Free performs two encodes and the durable AVIF/WebP pair is stored in R2.
      const media = await storeTelegramVehicleVariants(env,new Uint8Array(bytes),"telegram-"+row.id+"-"+(await sha256(String(row.file_id))).slice(0,16));
      processed.push({ row, ai, media, filePath });
      await env.DB.prepare("UPDATE telegram_inbox SET status='analyzed',processed_image_url=?,file_path=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(media.url, filePath, Number(row.id)).run();
    }
    const ai = primaryAi || {};
    const inboxId = Number(photoRow.id);
    const publishMediaKeys = processed.map(item => item.media.webp_key);
    const avifMediaKeys = processed.map(item => item.media.avif_key);
    await env.DB.prepare(`INSERT INTO vehicle_ai_drafts (inbox_id,status,ai_json,confidence,missing_fields_json,source_caption,source_file_path,created_at,updated_at) VALUES (?, 'draft', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(inbox_id) DO UPDATE SET ai_json=excluded.ai_json,confidence=excluded.confidence,missing_fields_json=excluded.missing_fields_json,source_caption=excluded.source_caption,source_file_path=excluded.source_file_path,error=NULL,status='draft',updated_at=CURRENT_TIMESTAMP`).bind(inboxId, JSON.stringify({ ...ai, publish_media_key: publishMediaKeys[0], publish_media_keys: publishMediaKeys, avif_media_keys: avifMediaKeys, bundle_key: bundleKey, image_count: publishMediaKeys.length, image_processing: "format-only", approval_required: true }), Number(ai.confidence || 0), JSON.stringify(ai.missing_fields || []), text, processed[0]?.filePath || "").run();
    const label = [ai.brand, ai.model].filter(Boolean).join(" ") || "Chưa xác định tên xe";
    await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='done',caption=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(text,bundleKey).run();
    await env.DB.prepare("UPDATE vehicle_ai_drafts SET status='awaiting_review',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?").bind(inboxId).run();
    await tg(token,"sendMessage",{chat_id:chatId,reply_to_message_id:Number(photoRow.message_id||0),text:[
      "📝 BẢN NHÁP XE — CHỜ DUYỆT",`📦 Inbox: ${inboxId}`,`🚗 Xe: ${label}`,
      ai.year?`📅 Năm: ${ai.year}`:null,ai.mileage!=null?`🛣 ODO: ${ai.mileage}`:null,ai.price!=null?`💰 Giá: ${ai.price}`:null,
      `🖼 Gallery: ${publishMediaKeys.length} cặp AVIF + WebP trên R2`,"🎨 Ảnh: chỉ chuyển định dạng; không che biển số/watermark/chế biến sơ.",
      "⛔ Chưa đăng website. Dùng /carpublish "+inboxId+" sau khi kiểm tra bản nháp."
    ].filter(Boolean).join("\n")});
  } catch (error) {
    // A later album image can fail after earlier privacy-verified images were
    // persisted. Roll those partial writes back so failed bundles leave no
    // orphan R2 objects or media_assets rows.
    for (const item of processed) {
      const keys=[item?.media?.webp_key,item?.media?.avif_key].map(key=>clean(key,1000)).filter(Boolean);
      for(const key of keys){await env.MEDIA?.delete(key).catch(()=>{});await env.DB?.prepare("DELETE FROM media_assets WHERE r2_key=?").bind(key).run().catch(()=>{});}
    }
    const message = clean(error?.message || error);
    await env.DB.prepare("UPDATE telegram_inbox SET status='failed',bundle_status='failed',error=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(message, bundleKey).run().catch(() => {});
    await tg(token, "sendMessage", { chat_id: chatId, text: `❌ Không xử lý được gói ảnh + thông tin\n📦 Bundle: ${bundleKey}\n⚠️ ${message}` }).catch(() => {});
  }
}

function blogCommand(caption){const raw=clean(caption,12000);if(!/^\/(blog|news)\b/i.test(raw))return null;const body=raw.replace(/^\/(blog|news)\b/i,"").trim();if(!body)return null;const lines=body.split(/\r?\n/).map(x=>x.trim());const title=clean(lines.shift(),240);const content=clean(lines.join("\n"),100000);return title&&content?{title,content,excerpt:clean(content,500),category:"Tin tức",status:"published"}:null}
async function publishTelegramBlog(env,message,chatId){const token=autoBotToken(env),draft=blogCommand(message?.caption||message?.text);if(!draft)return false;const photo=pickPhoto(message);if(photo){if(Number(photo.file_size||0)>imageInputLimit())throw new Error('Ảnh vượt giới hạn 15 MB.');const file=await tg(token,"getFile",{file_id:photo.file_id});const path=clean(file?.file_path,1000);if(!/^[A-Za-z0-9_./-]+$/.test(path)||path.includes('..'))throw new Error('Đường dẫn ảnh Telegram không hợp lệ.');const image=await fetch(`https://api.telegram.org/file/bot${token}/${path}`);if(!image.ok||!image.body)throw new Error(`Telegram blog image download failed: ${image.status}`);if(Number(image.headers.get('content-length')||0)>imageInputLimit())throw new Error('Ảnh vượt giới hạn 15 MB.');const bytes=await boundedBytes(image.body,imageInputLimit());draft.cover_image=(await storePublishingImage(env,bytes)).url}
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
    if (Number(photo.file_size||0)>imageInputLimit()||Number(image.headers.get('content-length')||0)>imageInputLimit()) throw new Error("Ảnh vượt giới hạn 15 MB.");
    const bytes = await boundedBytes(image.body,imageInputLimit());
    const type = image.headers.get("content-type") || "image/jpeg";
    const generated = await generateVehicleBlog(env, bytes, type, caption);
    // Reuse the same fail-closed privacy + canonical WebP storage contract as
    // ChatGPT publishing. Never persist the raw Telegram photo as a blog cover.
    const media = await storePublishingImage(env, new Uint8Array(bytes));
    ({ post } = await createBlogPost(env, generated.draft, { chatId, slug, coverImage: media.url }));
    console.log("telegram_auto_blog_created", { model: generated.model, vision_model: generated.visionModel });
  }
  await tg(token, "sendMessage", { chat_id: chatId, text: `📰 BÀI BLOG\n${post.title}\nhttps://phanthuanxtra.com/blog/${post.slug}` });
}

async function publishReviewedCar(env,chatId,inboxId){
  if(!canPublishAutoBlog(env,chatId))throw new Error("Chat này chưa được cấp quyền publish.");
  const row=await env.DB.prepare("SELECT d.ai_json,d.status,i.chat_id FROM vehicle_ai_drafts d JOIN telegram_inbox i ON i.id=d.inbox_id WHERE d.inbox_id=? LIMIT 1").bind(inboxId).first();
  if(!row||String(row.chat_id)!==String(chatId))throw new Error("Không tìm thấy bản nháp xe của chat này.");
  if(row.status!=="awaiting_review")throw new Error("Bản nháp không ở trạng thái chờ duyệt.");
  const ai=JSON.parse(row.ai_json||"{}"),keys=Array.isArray(ai.publish_media_keys)?ai.publish_media_keys.filter(Boolean):[];
  if(!keys.length)throw new Error("Bản nháp chưa có ảnh WebP.");
  const promotion=await promoteDraft(env,Number(inboxId),ai,keys[0],keys,true);
  if(!promotion?.published)throw new Error(promotion?.reason||"Publish gate rejected listing");
  await env.DB.prepare("UPDATE telegram_inbox SET status='published',bundle_status='published',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(inboxId).run();
  return promotion;
}

export async function processTelegramUpdate(env, update, chatId) {
  const token = autoBotToken(env);
  const message = update?.message || update?.channel_post;
  if (!message?.chat?.id) return;
  if (await handleEditorialMessage(env, message, chatId)) return;
  const photo = pickPhoto(message);
  const caption = clean(message.caption || message.text);
  const command = parseAutoCommand(caption);
  const carPublish=/^\/carpublish\s+(\d+)\s*$/i.exec(caption);
  if(carPublish){
    try{const result=await publishReviewedCar(env,chatId,Number(carPublish[1]));await tg(token,"sendMessage",{chat_id:chatId,text:`🚀 ĐÃ DUYỆT + ĐĂNG XE\n📦 Inbox: ${carPublish[1]}\n🚗 ID: ${result.car_id}\n🌐 https://phanthuanxtra.com/`});}
    catch(error){await tg(token,"sendMessage",{chat_id:chatId,text:"❌ Chưa đăng xe: "+clean(error?.message||error)});}
    return;
  }
  if (["start", "help"].includes(command?.name)) {
    await tg(token, "sendMessage", { chat_id: chatId, text: "PHAN THUẦN XTRA AUTO\n/chat <câu hỏi> — tư vấn xe\nẢnh + /blog <ghi chú> — AI phân tích và đăng Blog (chat được cấp quyền)\n/blog <tiêu đề>\\n<nội dung> — đăng bài đã soạn\nẢnh + thông tin xe — tạo draft AVIF/WebP trên R2; không tự đăng.\n/carpublish <Inbox ID> — duyệt và đăng xe sau khi kiểm tra." + EDITORIAL_HELP });
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
  if(mediaGroupId){
    // Telegram emits one webhook update per album item. Wait until this media_group
    // has been quiet long enough, then let exactly one waiter claim/process the bundle.
    await sleep(2200);
    const latest=await env.DB.prepare("SELECT message_id,caption,bundle_status FROM telegram_inbox WHERE bundle_key=? ORDER BY id DESC LIMIT 1").bind(bundleKey).first();
    if(Number(latest?.message_id||0)!==Number(message.message_id||0)||latest?.bundle_status!=="pending")return;
    const rows=(await env.DB.prepare("SELECT id,file_id,caption FROM telegram_inbox WHERE bundle_key=? ORDER BY id").bind(bundleKey).all()).results||[];
    const hasPhoto=rows.some(row=>Boolean(row.file_id)),hasText=rows.some(row=>clean(row.caption));
    if(hasPhoto&&hasText){
      await tg(token,"sendMessage",{chat_id:chatId,reply_to_message_id:Number(message.message_id||0),text:`📥 ĐÃ NHẬN ALBUM XE — ${rows.filter(row=>row.file_id).length} ẢNH\n⏳ Đang tạo bản nháp AVIF + WebP...`}).catch(()=>{});
      await processBundle(env,bundleKey,chatId);
    }else{
      await tg(token,"sendMessage",{chat_id:chatId,reply_to_message_id:Number(message.message_id||0),text:"📥 Đã nhận album ảnh. Gửi phần thông tin xe trong một tin nhắn tiếp theo để ghép tự động."}).catch(()=>{});
    }
    return;
  }
  const rows = (await env.DB.prepare("SELECT id,file_id,caption,bundle_status FROM telegram_inbox WHERE bundle_key=? ORDER BY id").bind(bundleKey).all()).results || [];
  const hasPhoto = rows.some(row => Boolean(row.file_id));
  const hasText = rows.some(row => clean(row.caption));
  if (hasPhoto && hasText) {
    await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(message.message_id || 0), text: "📥 ĐÃ GHÉP ẢNH + THÔNG TIN XE\n⏳ Đang tạo bản nháp..." }).catch(() => {});
    if ((await env.DB.prepare("SELECT bundle_status FROM telegram_inbox WHERE bundle_key=? LIMIT 1").bind(bundleKey).first())?.bundle_status === "pending") await processBundle(env, bundleKey, chatId);
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
  if (isEditorialMessage(message) && !secret) return json({ error: "Webhook secret required for editorial publishing" }, 503);
  const chatId = String(message.chat.id);
  // Album items are acknowledged once by the debounced media_group processor below.
  // Non-album updates retain the immediate receipt.
  if(!message.media_group_id){
    const receipt = parseAutoCommand(caption) || (!photo && isAutoChat(caption)) ? "📥 Đã nhận yêu cầu. Đang xử lý..." : telegramWebhookReceipt(Boolean(photo));
    try { await tg(token, "sendMessage", { chat_id: chatId, reply_to_message_id: Number(message.message_id || 0), text: receipt }); } catch (error) { console.error("telegram_receipt_failed", clean(error?.message || error)); }
  }
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
