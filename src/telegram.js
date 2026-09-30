const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const clean=v=>String(v??"").trim();
const retryableStatus=s=>s===408||s===425||s===429||s>=500;
async function telegramCall(env,method,payload){
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)throw new Error("Telegram secrets are not configured");
  const url=`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;let last="Telegram API error";
  for(let attempt=1;attempt<=3;attempt++){
    const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,...payload})});
    const d=await r.json().catch(()=>({}));if(r.ok&&d.ok)return d.result;last=clean(d.description)||`Telegram HTTP ${r.status}`;
    if(!retryableStatus(r.status)||attempt===3)break;const retryAfter=Math.min(Number(d?.parameters?.retry_after||0),5);await new Promise(resolve=>setTimeout(resolve,(retryAfter||attempt)*1000));
  }throw new Error(last);
}
function line(label,value){const v=clean(value);return v?`<b>${label}:</b> ${esc(v)}\n`:""}
function buildCaption(car){
  const title=[clean(car.brand),clean(car.model)].filter(Boolean).join(" ")||clean(car.id);let out=`🔥 <b>${esc(title)}</b>\n\n`;
  out+=line("Năm",car.year);out+=line("ODO",car.mileage?`${Number(car.mileage).toLocaleString("vi-VN")} km`:"");out+=line("Màu ngoại thất",car.color);out+=line("Nội thất",car.interior);out+=line("Động cơ",car.engine||car.fuel);out+=line("Hộp số",car.transmission);out+=line("Số chỗ",car.seats);out+=line("Xuất xứ",car.origin);out+=line("Giá",car.price?`${Number(car.price).toLocaleString("vi-VN")} VNĐ`:"");out+=line("Tình trạng",car.status==='available'?"Đang bán":car.status);
  let features=[];try{features=JSON.parse(car.features_json||"[]")}catch{}features=Array.isArray(features)?features.map(clean).filter(Boolean).slice(0,12):[];
  if(features.length)out+=`\n✨ <b>OPTION NỔI BẬT</b>\n${features.map(x=>`• ${esc(x)}`).join("\n")}\n`;if(clean(car.description))out+=`\n${esc(car.description).slice(0,3000)}\n`;
  out+=`\n📞 <b>LIÊN HỆ</b>\nPhan Thuần Xtra\n0866 997 891\n🌐 phanthuanxtra.com`;return out.slice(0,1024);
}
async function imagesFor(db,carId){try{const q=await db.prepare("SELECT url FROM car_images WHERE car_id=? ORDER BY sort_order,id").bind(carId).all();return(q.results||[]).map(x=>clean(x.url)).filter(x=>/^https?:\/\//i.test(x)).slice(0,30)}catch{return[]}}
async function publishCar(env,carId,{force=false}={}){
  if(!env.DB)throw new Error("D1 chưa được kết nối");const car=await env.DB.prepare("SELECT * FROM cars WHERE id=?").bind(carId).first();if(!car)throw new Error("Không tìm thấy xe");if(car.status==='hidden')throw new Error("Xe đang ở trạng thái hidden, không được đăng Telegram");
  const existing=await env.DB.prepare("SELECT * FROM telegram_posts WHERE car_id=?").bind(carId).first();if(existing?.status==='published'&&!force)return{duplicate:true,post:existing};if(existing?.status==='pending'&&!force){const age=Date.now()-Date.parse(existing.updated_at||existing.created_at||0);if(age<300000)throw new Error("Bài đăng đang được xử lý, vui lòng thử lại sau")}
  if(existing)await env.DB.prepare("UPDATE telegram_posts SET status='pending',attempts=attempts+1,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE car_id=?").bind(carId).run();else await env.DB.prepare("INSERT INTO telegram_posts (car_id,status,attempts) VALUES (?,'pending',1)").bind(carId).run();
  try{
    const caption=buildCaption(car),images=await imagesFor(env.DB,carId),messageIds=[];
    if(images.length){for(let i=0;i<images.length;i+=10){const chunk=images.slice(i,i+10);const media=chunk.map((url,index)=>({type:"photo",media:url,...(i===0&&index===0?{caption,parse_mode:"HTML"}:{})}));let result;try{result=await telegramCall(env,"sendMediaGroup",{media})}catch(error){if(!/WEBPAGE_CURL_FAILED/i.test(clean(error?.message)))throw error;const fallback=await telegramCall(env,"sendMessage",{text:i===0?caption:`🖼 Ảnh xe: ${chunk.length} ảnh trên website`,parse_mode:"HTML",disable_web_page_preview:true});if(fallback?.message_id)messageIds.push(fallback.message_id);continue}if(Array.isArray(result))messageIds.push(...result.map(x=>x.message_id).filter(Boolean))}}
    else{const result=await telegramCall(env,"sendMessage",{text:caption,parse_mode:"HTML"});if(result?.message_id)messageIds.push(result.message_id)}
    const cta=await telegramCall(env,"sendMessage",{text:"🔒 <b>PRIVATE APPOINTMENT</b>\nTư vấn riêng cùng Phan Thuần Xtra.",parse_mode:"HTML",reply_markup:{inline_keyboard:[[{text:"Xem PHAN THUẦN XTRA",url:"https://phanthuanxtra.com/"},{text:"☎ Liên hệ",url:"https://phanthuanxtra.com/#contact"}]]}});if(cta?.message_id)messageIds.push(cta.message_id);
    await env.DB.prepare("UPDATE telegram_posts SET status='published',telegram_message_ids=?,published_at=CURRENT_TIMESTAMP,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE car_id=?").bind(JSON.stringify(messageIds),carId).run();return{duplicate:false,car_id:carId,status:"published",message_ids:messageIds,images:images.length};
  }catch(error){const message=clean(error?.message).slice(0,1000)||"Telegram publish failed";await env.DB.prepare("UPDATE telegram_posts SET status='failed',last_error=?,updated_at=CURRENT_TIMESTAMP WHERE car_id=?").bind(message,carId).run();throw error}
}
export async function handleTelegramApi(request,env){
  const url=new URL(request.url);if(url.pathname!=="/api/admin/telegram/publish")return null;const auth=request.headers.get("Authorization")||"";if(!env.ADMIN_TOKEN||auth!==`Bearer ${env.ADMIN_TOKEN}`)return json({error:"Unauthorized"},401,{"WWW-Authenticate":"Bearer"});if(request.method!=="POST")return json({error:"Method Not Allowed"},405,{Allow:"POST"});
  const body=await request.json().catch(()=>null),carId=clean(body?.car_id).slice(0,100);if(!carId)return json({error:"car_id là bắt buộc"},400);try{return json(await publishCar(env,carId,{force:Boolean(body?.force)}),200)}catch(error){console.error("telegram_publish",{carId,error:String(error?.message||error)});return json({ok:false,error:clean(error?.message)||"Telegram publish failed"},500)}
}
export{publishCar,buildCaption};
