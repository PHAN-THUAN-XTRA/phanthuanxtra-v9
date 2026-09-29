const clean=v=>String(v??"").trim().slice(0,1200);

async function tg(env,method,payload={}){
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return false;
  const r=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw new Error(clean(d.description)||`Telegram ${method} failed`);
  return true;
}

function isAutomationAudit(event){
  if(event?.resource!=="car")return false;
  const id=String(event.resource_id||"");
  const summary=String(event.summary||"");
  return /^(?:stage3-|ci-e2e-|ci-origin-e2e-)/i.test(id)
    || /\bPTX-E2E(?:\b|[-_:])/i.test(summary)
    || /\bPHAN THUẦN XTRA Blog E2E\b/i.test(summary);
}

function textFor(event,car){
  const name=[event.summary?.split(" ")?.[0],event.summary?.split(" ")?.slice(1).join(" ")].filter(Boolean).join(" ")||event.resource_id;
  if(event.action==="delete")return `🗑️ ĐÃ XOÁ BÀI XE KHỎI WEBSITE
🚗 ${name}
🆔 ${event.resource_id}
🌐 phanthuanxtra.com
✅ Đã ghi audit: xoá xe.`;
  if(car?.status==="sold")return `🏁 XE ĐÃ BÁN — ĐÃ CẬP NHẬT WEBSITE
🚗 ${name}
🆔 ${event.resource_id}
📌 Trạng thái: SOLD
🌐 phanthuanxtra.com
✅ Không còn ở danh sách xe đang bán.`;
  if(event.action==="update")return `✏️ ĐÃ CẬP NHẬT BÀI XE TRÊN WEBSITE
🚗 ${name}
🆔 ${event.resource_id}
📌 Trạng thái: ${clean(car?.status)||"đã cập nhật"}
🌐 phanthuanxtra.com
✅ Thay đổi đã ghi vào D1.`;
  return `🆕 ĐÃ TẠO BÀI XE TRÊN WEBSITE
🚗 ${name}
🆔 ${event.resource_id}
🌐 phanthuanxtra.com
✅ Bài đã ghi vào D1.`;
}

export async function reconcileTelegramNotifications(env){
  if(!env.DB||!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return {ok:false,skipped:true,reason:"notification secrets or DB missing"};
  const cursor=await env.DB.prepare("SELECT last_audit_id FROM telegram_notification_cursor WHERE id=1").first();
  let lastId=Number(cursor?.last_audit_id||0);
  const events=(await env.DB.prepare("SELECT id,action,resource,resource_id,summary,created_at FROM cms_audit_log WHERE id>? AND action IN ('create','update','delete') ORDER BY id ASC LIMIT 25").bind(lastId).all()).results||[];
  if(!events.length)return {ok:true,processed:0,last_audit_id:lastId};
  let processed=0;
  for(const event of events){
    if(isAutomationAudit(event)){
      lastId=Number(event.id);
      processed++;
      await env.DB.prepare("UPDATE telegram_notification_cursor SET last_audit_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=1").bind(lastId).run();
      console.log("telegram_notification_e2e_suppressed",event.resource_id);
      continue;
    }
    let car=null;
    if(event.resource==="car"&&event.action!=="delete")car=await env.DB.prepare("SELECT id,brand,model,status FROM cars WHERE id=?").bind(event.resource_id).first();
    try{
      await tg(env,"sendMessage",{chat_id:env.TELEGRAM_CHAT_ID,text:textFor(event,car),disable_web_page_preview:true});
      lastId=Number(event.id);
      await env.DB.prepare("UPDATE telegram_notification_cursor SET last_audit_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=1").bind(lastId).run();
    }catch(error){
      console.error("telegram_notification_failed",String(error?.message||error));
      break;
    }
  }
  return {ok:true,processed,last_audit_id:lastId};
}
