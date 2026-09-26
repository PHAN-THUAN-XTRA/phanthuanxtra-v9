import { saveCar } from "./vehicle-persistence.js";
import { analyzeVehicleImage } from "./vehicle-ai.js";
import { createPtXtraPlateImage, hasValidPlateBox } from "./plate-branding.js";
import { publishCar } from "./telegram.js";

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra}});
const clean=v=>String(v??"").trim();
const sha256=async value=>{const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest("SHA-256",bytes);return[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")};
const AUTO_PUBLISH_MIN_CONFIDENCE=0.85;

async function tg(env,method,payload={}){
  if(!env.TELEGRAM_BOT_TOKEN)throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const r=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw new Error(clean(d.description)||`Telegram ${method} failed`);
  return d.result;
}

function pickPhoto(message){const photos=Array.isArray(message?.photo)?message.photo:[];return photos.length?photos[photos.length-1]:null;}
function authorized(request,env){const h=request.headers.get("Authorization")||"";return Boolean(env.ADMIN_TOKEN&&h===`Bearer ${env.ADMIN_TOKEN}`)}
function canAutoPublish(ai){return Boolean(ai?.brand&&ai?.model&&Number(ai?.confidence||0)>=AUTO_PUBLISH_MIN_CONFIDENCE)}
function carIdForInbox(inboxId){return `tg-${Number(inboxId)}`}

function safeWebhookInfo(info,expectedUrl){
  const actual=clean(info?.url);
  return {ok:true,configured:Boolean(actual),url_configured:Boolean(actual),url_matches_expected:actual===expectedUrl,expected_url:expectedUrl,has_custom_certificate:Boolean(info?.has_custom_certificate),pending_update_count:Number(info?.pending_update_count||0),last_error_date:info?.last_error_date||null,last_error_message:clean(info?.last_error_message,500)||null,last_synchronization_error_date:info?.last_synchronization_error_date||null,max_connections:info?.max_connections||null,ip_address:info?.ip_address||null};
}

async function getTelegramWebhookInfo(env){return tg(env,"getWebhookInfo",{});}

export async function getTelegramWebhookStatus(env,expectedUrl){
  if(!env.TELEGRAM_BOT_TOKEN) return {ok:false,error:"TELEGRAM_BOT_TOKEN is not configured"};
  try{return safeWebhookInfo(await getTelegramWebhookInfo(env),expectedUrl);}catch(error){return {ok:false,error:clean(error?.message||error)||"Telegram getWebhookInfo failed"};}
}

function reportText(ai,inboxId,mediaKey,published=false){
  const a=ai||{};
  const label=[a.brand,a.model].filter(Boolean).join(" ")||"Chưa xác định tên xe";
  const plateDetected=hasValidPlateBox(a?.plate_bbox);
  const lines=[published?"🚀 ĐÃ PHÂN TÍCH + TỰ ĐĂNG XE":"✅ ĐÃ NHẬN ẢNH + THÔNG TIN XE",`📦 Inbox ID: ${inboxId}`,`🚗 Xe: ${label}`,a.year?`📅 Năm: ${a.year}`:null,a.mileage!=null?`🛣 ODO: ${a.mileage}`:null,a.price!=null?`💰 Giá: ${a.price}`:null,a.fuel?`⛽ Nhiên liệu: ${a.fuel}`:null,a.color?`🎨 Màu: ${a.color}`:null,`🎯 Độ tin cậy AI: ${Math.round(Number(a.confidence||0)*100)}%`,plateDetected?"🪪 Biển số: Đã xác định vùng — có thể áp dụng branding PT Xtra":"🪪 Biển số: Chưa xác định vùng — không dùng biển số làm điều kiện đăng",Array.isArray(a.missing_fields)&&a.missing_fields.length?`⚠️ Cần bổ sung: ${a.missing_fields.join(", ")}`:"✅ Không phát hiện trường bắt buộc còn thiếu","",published?"📌 Trạng thái: Đã tạo bản ghi xe trên website và áp dụng duplicate protection.":"📌 Trạng thái: Đã lưu ảnh gốc + bản nháp AI; chưa publish.",published?"🛡 Duplicate protection: telegram_posts.car_id":"⏳ Chưa tự đăng vì chưa đạt ngưỡng identity/confidence của AI.",mediaKey?`🖼 Ảnh website: /media/${mediaKey}`:null].filter(Boolean);return lines.join("\n");}

async function promoteDraft(env,inboxId,ai,publishMediaKey,publishMediaKeys=[publishMediaKey]){
  if(!canAutoPublish(ai))return {published:false,reason:"identity_or_confidence_below_threshold"};
  const carId=carIdForInbox(inboxId); const description=clean(ai.description,10000)||`Xe ${clean(ai.brand)} ${clean(ai.model)} được nhập từ Telegram và phân tích bởi AI.`; const features=Array.isArray(ai.features)?ai.features.map(clean).filter(Boolean).slice(0,80):[]; const mediaKeys=(Array.isArray(publishMediaKeys)?publishMediaKeys:[publishMediaKey]).map(clean).filter(Boolean); const imageUrls=mediaKeys.map(key=>`https://phanthuanxtra.com/media/${encodeURIComponent(key)}`); const imageUrl=imageUrls[0]||`https://phanthuanxtra.com/media/${encodeURIComponent(publishMediaKey)}`;
  const existing=await env.DB.prepare("SELECT id,status FROM cars WHERE id=? LIMIT 1").bind(carId).first();
  if(!existing){const saved=await saveCar(env.DB,{id:carId,brand:ai.brand,model:ai.model,year:ai.year??null,mileage:ai.mileage??0,price:ai.price??0,fuel:ai.fuel,category:ai.category||"other",color:ai.color,status:"available",description,features,featured:false,cover_image:imageUrl,images:imageUrls.length?imageUrls:[imageUrl]},{id:carId,mode:"create",actor:"telegram-ai"});if(!saved.ok)throw new Error(saved.error);}
  const published=await publishCar(env,carId); await env.DB.prepare("UPDATE vehicle_ai_drafts SET status='published',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?").bind(inboxId).run(); return {published:true,car_id:carId,telegram:published};
}

/** Atomically claims a received inbox row so Telegram retries/concurrent webhook deliveries cannot process it twice. */
export async function claimInbox(env,inboxId){
  const result=await env.DB.prepare("UPDATE telegram_inbox SET status='processing',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='received'").bind(inboxId).run();
  const changes=Number(result?.meta?.changes??result?.changes??0);
  return changes===1;
}

async function processInbox(env,inboxId,filePath,caption,sourceHash,chatId,messageId){
  if(!(await claimInbox(env,inboxId)))return;
  try{if(!env.MEDIA)throw new Error("MEDIA binding is not configured"); const imageResponse=await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`); if(!imageResponse.ok)throw new Error(`Telegram file download failed: ${imageResponse.status}`); const bytes=await imageResponse.arrayBuffer(); const contentType=imageResponse.headers.get("content-type")||"image/jpeg"; const extension=contentType.includes("png")?"png":contentType.includes("webp")?"webp":"jpg"; const mediaKey=`vehicles/inbox-${inboxId}-${sourceHash.slice(0,16)}.${extension}`; await env.MEDIA.put(mediaKey,bytes,{httpMetadata:{contentType,cacheControl:"public, max-age=31536000, immutable"}}); const ai=await analyzeVehicleImage(env,bytes,contentType,caption); await env.DB.prepare(`INSERT INTO vehicle_ai_drafts (inbox_id,status,ai_json,confidence,missing_fields_json,source_caption,source_file_path,created_at,updated_at) VALUES (?, 'draft', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(inbox_id) DO UPDATE SET ai_json=excluded.ai_json,confidence=excluded.confidence,missing_fields_json=excluded.missing_fields_json,source_caption=excluded.source_caption,source_file_path=excluded.source_file_path,error=NULL,status='draft',updated_at=CURRENT_TIMESTAMP`).bind(inboxId,JSON.stringify({...ai,media_key:mediaKey}),Number(ai.confidence||0),JSON.stringify(ai.missing_fields||[]),caption,filePath).run(); await env.DB.prepare(`UPDATE telegram_inbox SET status='analyzed',processed_image_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(`/media/${mediaKey}`,inboxId).run();
    if(!canAutoPublish(ai)){await env.DB.prepare("UPDATE vehicle_ai_drafts SET status='awaiting_review',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?").bind(inboxId).run(); if(chatId)await tg(env,"sendMessage",{chat_id:chatId,reply_to_message_id:messageId,text:reportText(ai,inboxId,mediaKey,false),disable_web_page_preview:true}); return;}
    const plateDetected=hasValidPlateBox(ai?.plate_bbox); let publishMediaKey=mediaKey;
    if(plateDetected){publishMediaKey=`vehicles/publish-inbox-${inboxId}-${sourceHash.slice(0,16)}.jpg`; await createPtXtraPlateImage(env,bytes,contentType,ai.plate_bbox,publishMediaKey); await env.DB.prepare(`UPDATE vehicle_ai_drafts SET ai_json=?,status='branded',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?`).bind(JSON.stringify({...ai,media_key:mediaKey,publish_media_key:publishMediaKey,branding:"PT Xtra",branding_target:"license_plate"}),inboxId).run();}
    else{await env.DB.prepare(`UPDATE vehicle_ai_drafts SET ai_json=?,status='ready_to_publish',updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?`).bind(JSON.stringify({...ai,media_key:mediaKey,publish_media_key:mediaKey,branding:"none",branding_target:null}),inboxId).run();}
    await env.DB.prepare(`UPDATE telegram_inbox SET processed_image_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(`/media/${publishMediaKey}`,inboxId).run(); let promotion={published:false,reason:"not_attempted"}; try{promotion=await promoteDraft(env,inboxId,ai,publishMediaKey);if(promotion.published)await env.DB.prepare("UPDATE telegram_inbox SET status='published',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(inboxId).run();}catch(error){promotion={published:false,reason:clean(error?.message||error)||"publish_failed"};await env.DB.prepare("UPDATE vehicle_ai_drafts SET status='publish_failed',error=?,updated_at=CURRENT_TIMESTAMP WHERE inbox_id=?").bind(promotion.reason,inboxId).run().catch(()=>{});} if(chatId)await tg(env,"sendMessage",{chat_id:chatId,reply_to_message_id:messageId,text:reportText(ai,inboxId,publishMediaKey,promotion.published),disable_web_page_preview:true});
  }catch(error){const message=clean(error?.message||error); await env.DB.prepare(`UPDATE telegram_inbox SET status='failed',error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(message,inboxId).run().catch(()=>{}); if(chatId)await tg(env,"sendMessage",{chat_id:chatId,reply_to_message_id:messageId,text:["❌ KHÔNG XỬ LÝ ĐƯỢC ẢNH XE",`📦 Inbox ID: ${inboxId}`,`⚠️ Lỗi: ${message}`,"🔄 Hệ thống đã ghi nhận lỗi để kiểm tra lại."].join("\n"),disable_web_page_preview:true}).catch(()=>{});}
}

export async function handleTelegramIngest(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==="/api/admin/telegram/webhook-status"){
    if(request.method!=="GET")return json({error:"Method Not Allowed"},405,{Allow:"GET"});
    if(!authorized(request,env))return json({error:"Unauthorized"},401,{"WWW-Authenticate":"Bearer"});
    const expected=`${url.origin}/api/telegram/webhook`; return json(await getTelegramWebhookStatus(env,expected));
  }
  if(url.pathname==="/api/admin/telegram/webhook"){
    if(request.method!=="POST")return json({error:"Method Not Allowed"},405,{Allow:"POST"}); if(!authorized(request,env))return json({error:"Unauthorized"},401,{"WWW-Authenticate":"Bearer"});
    try{const result=await setTelegramWebhook(env,`${url.origin}/api/telegram/webhook`); return json({ok:true,webhook:result});}catch(error){console.error("telegram_webhook_setup_failed",String(error?.message||error));return json({ok:false,error:"Telegram setWebhook failed",detail:clean(error?.message||error)||"Unknown Telegram error"},502);}
  }
  if(url.pathname!=="/api/telegram/webhook")return null; if(request.method!=="POST")return json({error:"Method Not Allowed"},405,{Allow:"POST"}); const secret=env.TELEGRAM_WEBHOOK_SECRET; if(secret&&request.headers.get("X-Telegram-Bot-Api-Secret-Token")!==secret)return json({error:"Unauthorized"},401); const update=await request.json().catch(()=>null); const message=update?.message||update?.channel_post||null; if(!message)return json({ok:true,ignored:true}); if(!env.DB)return json({ok:false,error:"D1 chưa được kết nối"},500); const photo=pickPhoto(message); const caption=clean(message.caption||message.text); if(!photo&&!caption)return json({ok:true,ignored:true}); const fileId=photo?.file_id||""; let filePath=""; if(photo){const file=await tg(env,"getFile",{file_id:photo.file_id}); filePath=clean(file?.file_path); if(!filePath)throw new Error("Telegram không trả file_path");} const sourceHash=await sha256(`${message.chat?.id||""}:${message.message_id}:${photo?.file_unique_id||fileId||caption}`); await env.DB.prepare(`INSERT INTO telegram_inbox (source_hash,chat_id,message_id,file_id,file_unique_id,file_path,caption,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'received',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(source_hash) DO NOTHING`).bind(sourceHash,String(message.chat?.id||""),Number(message.message_id||0),fileId,photo?.file_unique_id||"",filePath,caption).run(); const inbox=await env.DB.prepare(`SELECT id FROM telegram_inbox WHERE source_hash=? LIMIT 1`).bind(sourceHash).first(); const chatId=String(message.chat?.id||""); if(inbox?.id&&chatId){const receipt=photo&&caption?"📥 ĐÃ NHẬN ẢNH + THÔNG TIN XE\n⏳ Đang lưu ảnh, phân tích AI; nếu xác định được biển số thì sẽ áp dụng branding PT Xtra. Biển số không phải điều kiện publish.":"📥 ĐÃ NHẬN DỮ LIỆU TỪ TELEGRAM\n⏳ Đang xử lý..."; await tg(env,"sendMessage",{chat_id:chatId,reply_to_message_id:Number(message.message_id||0),text:`${receipt}\n📦 Inbox ID: ${inbox.id}`}).catch(()=>{});} if(inbox?.id&&photo&&ctx)ctx.waitUntil(processInbox(env,Number(inbox.id),filePath,caption,sourceHash,chatId,Number(message.message_id||0))); return json({ok:true,received:true,source_hash:sourceHash,inbox_id:inbox?.id||null,queued:Boolean(photo&&ctx)});
}

export async function setTelegramWebhook(env,webhookUrl){const payload={url:webhookUrl,allowed_updates:["message","channel_post"]};if(env.TELEGRAM_WEBHOOK_SECRET)payload.secret_token=env.TELEGRAM_WEBHOOK_SECRET;return tg(env,"setWebhook",payload);}

export { canAutoPublish, promoteDraft };