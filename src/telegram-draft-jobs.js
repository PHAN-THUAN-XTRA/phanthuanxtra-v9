import { boundedBytes } from "./publishing-api.js";
import { imageInputLimit } from "./media-policy.js";
import { storeTelegramVehicleVariants } from "./telegram-media-variants.js";

const clean=(v,n=10000)=>String(v??"").trim().slice(0,n);
const tokenOf=env=>env.TELEGRAM_AUTO_BOT_TOKEN||env.TELEGRAM_BOT_TOKEN;
async function tg(token,method,payload={}){
  const r=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw new Error(clean(d.description||("Telegram "+method+" failed")));
  return d.result;
}
const sha256=async value=>{const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");};

async function processBatch(env,bundleKey,chatId){
  const claim=await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='processing',updated_at=CURRENT_TIMESTAMP WHERE bundle_key=? AND bundle_status='queued'").bind(bundleKey).run();
  if(Number(claim?.meta?.changes||0)<1)return {claimed:false};
  try{
    let rows=(await env.DB.prepare("SELECT * FROM telegram_inbox WHERE bundle_key=? ORDER BY id ASC").bind(bundleKey).all()).results||[];
    const photos=rows.filter(r=>r.file_id),first=photos[0];
    if(!first)throw new Error("Bundle không có ảnh xe.");
    const text=rows.map(r=>clean(r.caption)).filter(Boolean).join("\n\n");
    const pending=photos.filter(r=>r.status!=="analyzed"||!clean(r.processed_image_url)).slice(0,3);
    await Promise.all(pending.map(async row=>{
      const token=tokenOf(env);
      const file=await tg(token,"getFile",{file_id:row.file_id});
      const filePath=clean(file?.file_path,1000);
      if(!filePath)throw new Error("Telegram did not return file_path");
      const image=await fetch("https://api.telegram.org/file/bot"+token+"/"+filePath);
      if(!image.ok||!image.body)throw new Error("Telegram file download failed: "+image.status);
      if(Number(image.headers.get("content-length")||0)>imageInputLimit())throw new Error("Ảnh vượt giới hạn 15 MB.");
      const bytes=await boundedBytes(image.body,imageInputLimit());
      const media=await storeTelegramVehicleVariants(env,new Uint8Array(bytes),"telegram-"+row.id+"-"+(await sha256(String(row.file_id))).slice(0,16));
      await env.DB.prepare("UPDATE telegram_inbox SET status='analyzed',processed_image_url=?,file_path=?,error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(media.url,filePath,Number(row.id)).run();
    }));
    rows=(await env.DB.prepare("SELECT * FROM telegram_inbox WHERE bundle_key=? ORDER BY id ASC").bind(bundleKey).all()).results||[];
    const all=rows.filter(r=>r.file_id),done=all.filter(r=>r.status==="analyzed"&&clean(r.processed_image_url));
    if(done.length<all.length){
      await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='queued',error=NULL,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(bundleKey).run();
      return {claimed:true,complete:false,processed:done.length,total:all.length};
    }
    const webp=done.map(r=>clean(r.processed_image_url).replace(/^\/media\//,""));
    const avif=webp.map(k=>k.replace(/\.webp$/i,".avif"));
    const inboxId=Number(first.id);
    const ai={confidence:0,missing_fields:[],description:text,_ai_status:"deferred_for_durable_gallery"};
    const payload={...ai,publish_media_key:webp[0],publish_media_keys:webp,avif_media_keys:avif,bundle_key:bundleKey,image_count:webp.length,image_processing:"format-only",approval_required:true};
    await env.DB.prepare("INSERT INTO vehicle_ai_drafts (inbox_id,status,ai_json,confidence,missing_fields_json,source_caption,source_file_path,created_at,updated_at) VALUES (?, 'awaiting_review', ?, 0, '[]', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(inbox_id) DO UPDATE SET ai_json=excluded.ai_json,source_caption=excluded.source_caption,source_file_path=excluded.source_file_path,error=NULL,status='awaiting_review',updated_at=CURRENT_TIMESTAMP").bind(inboxId,JSON.stringify(payload),text,clean(first.file_path)).run();
    await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='done',caption=?,error=NULL,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(text,bundleKey).run();
    await tg(tokenOf(env),"sendMessage",{chat_id:chatId,reply_to_message_id:Number(first.message_id||0),text:"📝 BẢN NHÁP XE — CHỜ DUYỆT\n📦 Inbox: "+inboxId+"\n🖼 Gallery: "+webp.length+" cặp AVIF + WebP trên R2\n🟢 Xử lý bền vững qua D1 job đã hoàn tất.\n⛔ Chưa đăng website. Dùng /carpublish "+inboxId+" sau khi kiểm tra bản nháp."});
    return {claimed:true,complete:true,processed:done.length,total:all.length};
  }catch(error){
    const message=clean(error?.message||error,1000);
    await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='queued',error=?,updated_at=CURRENT_TIMESTAMP WHERE bundle_key=?").bind(message,bundleKey).run().catch(()=>{});
    return {claimed:true,complete:false,error:message};
  }
}

export async function reconcileTelegramVehicleDrafts(env){
  if(!env.DB)return {processed:0};
  await env.DB.prepare("UPDATE telegram_inbox SET bundle_status='queued',updated_at=CURRENT_TIMESTAMP WHERE bundle_status='processing' AND updated_at < datetime('now','-3 minutes')").run();
  const q=await env.DB.prepare("SELECT bundle_key,chat_id,MIN(id) id FROM telegram_inbox WHERE bundle_status='queued' GROUP BY bundle_key,chat_id ORDER BY id ASC LIMIT 4").all();
  const rows=q.results||[],results=[];
  // Drain a bounded number of durable 3-photo batches per bundle in one cron.
  // Every batch checkpoints D1 before the next claim, so interruption still resumes safely.
  for(const row of rows){
    const bundleKey=clean(row.bundle_key,500),chatId=String(row.chat_id);
    for(let batch=0;batch<8;batch++){
      const result=await processBatch(env,bundleKey,chatId);
      results.push({...result,bundle_key:bundleKey,batch:batch+1});
      if(!result.claimed||result.complete||result.error)break;
    }
  }
  return {processed:results.length,results};
}
