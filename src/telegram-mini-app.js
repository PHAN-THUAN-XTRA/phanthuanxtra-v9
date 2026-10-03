import { canPublishAutoBlog } from "./auto-bot-ai.js";
import { carImages, saveCar, reorderCarImages, validCarId } from "./vehicle-persistence.js";

const BASE="/api/telegram/mini/v1";
const MAX_AGE_SECONDS=15*60;
const STATUSES=new Set(["available","reserved","sold","hidden"]);
const CARE_STATUSES=new Set(["new","contacting","consulting","appointment","follow_up","won","lost"]);
const SEC={"X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Strict-Transport-Security":"max-age=31536000; includeSubDomains; preload"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...SEC}});
const clean=(value,max=500)=>String(value??"").trim().slice(0,max);
const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,"0")).join("");

async function hmac(keyBytes,value){
  const key=await crypto.subtle.importKey("raw",keyBytes,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)));
}
function timingSafeHexEqual(a,b){
  if(!/^[a-f0-9]{64}$/i.test(a)||!/^[a-f0-9]{64}$/i.test(b))return false;
  let diff=0;
  for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
export async function validateTelegramMiniAppInitData(initData,botToken,{now=Math.floor(Date.now()/1000),maxAgeSeconds=MAX_AGE_SECONDS}={}){
  if(!initData||!botToken)return {ok:false,reason:"missing_credentials"};
  const params=new URLSearchParams(initData);
  const suppliedHash=clean(params.get("hash"),64).toLowerCase();
  if(!suppliedHash)return {ok:false,reason:"missing_hash"};
  params.delete("hash");
  const dataCheck=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
  const secret=await hmac(new TextEncoder().encode("WebAppData"),botToken);
  const expected=hex(await hmac(secret,dataCheck));
  if(!timingSafeHexEqual(suppliedHash,expected))return {ok:false,reason:"invalid_hash"};
  const authDate=Number(params.get("auth_date"));
  if(!Number.isSafeInteger(authDate)||authDate>now+30||now-authDate>maxAgeSeconds)return {ok:false,reason:"expired"};
  let user=null;
  try{user=JSON.parse(params.get("user")||"null");}catch{return {ok:false,reason:"invalid_user"};}
  if(!user||!Number.isSafeInteger(Number(user.id)))return {ok:false,reason:"invalid_user"};
  return {ok:true,user,authDate};
}
async function authenticate(request,env){
  const initData=request.headers.get("X-Telegram-Init-Data")||"";
  const result=await validateTelegramMiniAppInitData(initData,env.TELEGRAM_AUTO_BOT_TOKEN||env.TELEGRAM_BOT_TOKEN);
  if(!result.ok)return result;
  if(!canPublishAutoBlog(env,result.user.id))return {ok:false,reason:"forbidden"};
  return result;
}
async function listCars(request,env){
  const u=new URL(request.url),q=clean(u.searchParams.get("q"),120).toLowerCase(),status=clean(u.searchParams.get("status"),30).toLowerCase();
  if(status&&!STATUSES.has(status))return json({error:"Trạng thái xe không hợp lệ"},400);
  let sql="SELECT * FROM cars",args=[],where=[];
  if(q){where.push("(LOWER(id) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(model) LIKE ?)");const like=`%${q}%`;args.push(like,like,like);}
  if(status){where.push("status=?");args.push(status);}
  if(where.length)sql+=" WHERE "+where.join(" AND ");
  sql+=" ORDER BY featured DESC,updated_at DESC,created_at DESC LIMIT 300";
  const rows=(await env.DB.prepare(sql).bind(...args).all()).results||[];
  const cars=await Promise.all(rows.map(async car=>({...car,images:await carImages(env.DB,car.id)})));
  return json({ok:true,cars,statuses:[...STATUSES]});
}
async function carDetail(env,id){
  if(!validCarId(id))return json({error:"ID xe không hợp lệ"},400);
  const car=await env.DB.prepare("SELECT * FROM cars WHERE id=?").bind(id).first();
  if(!car)return json({error:"Không tìm thấy xe"},404);
  const images=await carImages(env.DB,id);
  const audit=(await env.DB.prepare("SELECT id,actor,action,summary,created_at FROM cms_audit_log WHERE resource='car' AND resource_id=? ORDER BY created_at DESC,id DESC LIMIT 50").bind(id).all()).results||[];
  return json({ok:true,car:{...car,images},audit,public_url:car.status==="hidden"?null:`https://phanthuanxtra.com/car?id=${encodeURIComponent(id)}`});
}
async function updateCar(request,env,id){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"JSON không hợp lệ"},400);
  const allowed=["brand","model","year","mileage","price","fuel","category","color","description","featured"];
  const patch=Object.fromEntries(allowed.filter(k=>Object.prototype.hasOwnProperty.call(body,k)).map(k=>[k,body[k]]));
  if(!Object.keys(patch).length)return json({error:"Không có trường được phép cập nhật"},400);
  const saved=await saveCar(env.DB,patch,{id,mode:"update",actor:"telegram-mini-app"});
  if(!saved.ok)return json({error:saved.error},saved.status||400);
  return json({ok:true,id,car:saved.car});
}
async function reorderGallery(request,env,id){
  const body=await request.json().catch(()=>null);
  if(!body||!Array.isArray(body.image_ids))return json({error:"image_ids phải là mảng"},400);
  const result=await reorderCarImages(env.DB,id,body.image_ids,body.cover_image_id,{actor:"telegram-mini-app"});
  return json(result.ok?result:{error:result.error},result.status||400);
}
const customerIdOk=id=>/^cus_[A-Za-z0-9-]{20,80}$/.test(String(id||""));
async function listCustomers(request,env){
  const u=new URL(request.url),q=clean(u.searchParams.get("q"),120).toLowerCase(),status=clean(u.searchParams.get("status"),30).toLowerCase();
  if(status&&!CARE_STATUSES.has(status))return json({error:"Trạng thái chăm sóc không hợp lệ"},400);
  const like=`%${q}%`;
  const rows=(await env.DB.prepare(`SELECT c.id,c.display_name,c.status AS memory_status,c.created_at,c.updated_at,c.last_seen_at,
    COALESCE(cc.care_status,'new') care_status,COALESCE(cc.note,'') note,cc.follow_up_at,COALESCE(cc.ai_summary,'') ai_summary,cc.updated_at care_updated_at,
    (SELECT identity_value FROM xtra_memory_identities i WHERE i.customer_id=c.id AND i.identity_type='phone' ORDER BY i.verified DESC,i.last_seen_at DESC LIMIT 1) phone,
    (SELECT l.car_id FROM xtra_memory_lead_links ll JOIN leads l ON l.id=ll.lead_id WHERE ll.customer_id=c.id ORDER BY l.created_at DESC LIMIT 1) car_id,
    (SELECT COUNT(*) FROM xtra_memory_episodes ep WHERE ep.customer_id=c.id) episode_count
    FROM xtra_memory_customers c LEFT JOIN xtra_customer_care cc ON cc.customer_id=c.id
    WHERE (?='' OR LOWER(c.id) LIKE ? OR LOWER(COALESCE(c.display_name,'')) LIKE ? OR EXISTS(SELECT 1 FROM xtra_memory_identities qi WHERE qi.customer_id=c.id AND LOWER(qi.identity_value) LIKE ?))
      AND (?='' OR COALESCE(cc.care_status,'new')=?)
    ORDER BY CASE WHEN cc.follow_up_at IS NOT NULL AND cc.follow_up_at<=CURRENT_TIMESTAMP THEN 0 ELSE 1 END,COALESCE(cc.follow_up_at,c.last_seen_at) DESC LIMIT 300`)
    .bind(q,like,like,like,status,status).all()).results||[];
  return json({ok:true,customers:rows,statuses:[...CARE_STATUSES]});
}
async function customerDetail(env,id){
  if(!customerIdOk(id))return json({error:"ID khách hàng không hợp lệ"},400);
  const profile=await env.DB.prepare(`SELECT c.id,c.display_name,c.status AS memory_status,c.created_at,c.updated_at,c.last_seen_at,
    COALESCE(cc.care_status,'new') care_status,COALESCE(cc.note,'') note,cc.follow_up_at,COALESCE(cc.ai_summary,'') ai_summary,cc.updated_by,cc.updated_at care_updated_at
    FROM xtra_memory_customers c LEFT JOIN xtra_customer_care cc ON cc.customer_id=c.id WHERE c.id=? LIMIT 1`).bind(id).first();
  if(!profile)return json({error:"Không tìm thấy khách hàng"},404);
  const [identities,facts,episodes,leads,audit]=await Promise.all([
    env.DB.prepare("SELECT identity_type,identity_value,verified,last_seen_at FROM xtra_memory_identities WHERE customer_id=? ORDER BY verified DESC,last_seen_at DESC").bind(id).all(),
    env.DB.prepare("SELECT fact_key,fact_value,confidence,last_confirmed_at,status FROM xtra_memory_facts WHERE customer_id=? ORDER BY last_confirmed_at DESC LIMIT 50").bind(id).all(),
    env.DB.prepare("SELECT id,event_type,subject_type,subject_id,summary,outcome,source,happened_at FROM xtra_memory_episodes WHERE customer_id=? ORDER BY happened_at DESC LIMIT 50").bind(id).all(),
    env.DB.prepare("SELECT l.id,l.name,l.phone,l.car_id,l.message,l.status,l.note,l.created_at,l.updated_at FROM xtra_memory_lead_links ll JOIN leads l ON l.id=ll.lead_id WHERE ll.customer_id=? ORDER BY l.created_at DESC LIMIT 30").bind(id).all(),
    env.DB.prepare("SELECT id,actor,action,summary,created_at FROM xtra_customer_care_audit WHERE customer_id=? ORDER BY created_at DESC,id DESC LIMIT 50").bind(id).all()
  ]);
  return json({ok:true,customer:profile,identities:identities.results||[],facts:facts.results||[],episodes:episodes.results||[],leads:leads.results||[],audit:audit.results||[]});
}
async function updateCustomerCare(request,env,id){
  if(!customerIdOk(id))return json({error:"ID khách hàng không hợp lệ"},400);
  const exists=await env.DB.prepare("SELECT id FROM xtra_memory_customers WHERE id=? LIMIT 1").bind(id).first();
  if(!exists)return json({error:"Không tìm thấy khách hàng"},404);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"JSON không hợp lệ"},400);
  const status=clean(body.care_status,30),note=clean(body.note,3000),follow=clean(body.follow_up_at,40);
  if(!CARE_STATUSES.has(status))return json({error:"Trạng thái chăm sóc không hợp lệ"},400);
  if(follow&&Number.isNaN(Date.parse(follow)))return json({error:"Ngày follow-up không hợp lệ"},400);
  const followSql=follow?new Date(follow).toISOString():null;
  await env.DB.prepare(`INSERT INTO xtra_customer_care(customer_id,care_status,note,follow_up_at,updated_by,updated_at)
    VALUES (?,?,?,?, 'telegram-customer-mini-app',CURRENT_TIMESTAMP)
    ON CONFLICT(customer_id) DO UPDATE SET care_status=excluded.care_status,note=excluded.note,follow_up_at=excluded.follow_up_at,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,status,note,followSql).run();
  await env.DB.prepare("INSERT INTO xtra_customer_care_audit(customer_id,actor,action,summary) VALUES (?,'telegram-customer-mini-app','care_update',?)")
    .bind(id,clean(`${status}; follow_up=${followSql||"none"}; note=${note||"none"}`,500)).run();
  return customerDetail(env,id);
}
function deterministicCustomerSummary(detail){
  const c=detail.customer||{},facts=(detail.facts||[]).filter(x=>x.status==="active").slice(0,8);
  const episodes=(detail.episodes||[]).slice(0,5),leads=(detail.leads||[]).slice(0,3);
  const parts=[c.display_name?`Khách: ${c.display_name}.`:"Khách chưa có tên.",facts.length?`Nhu cầu: ${facts.map(x=>x.fact_key+"="+x.fact_value).join(", ")}.`:"Chưa có fact nhu cầu xác nhận.",leads[0]?.car_id?`Xe gần nhất: ${leads[0].car_id}.`:"",episodes[0]?.summary?`Tương tác gần nhất: ${clean(episodes[0].summary,220)}.`:"",`Trạng thái chăm sóc: ${c.care_status||"new"}.`];
  return clean(parts.filter(Boolean).join(" "),1200);
}
async function summarizeCustomer(env,id){
  const response=await customerDetail(env,id),detail=await response.json();
  if(!response.ok)return json(detail,response.status);
  let summary=deterministicCustomerSummary(detail),model="deterministic";
  if(env.AI){
    const evidence={customer:{display_name:detail.customer.display_name,care_status:detail.customer.care_status,follow_up_at:detail.customer.follow_up_at},facts:detail.facts.filter(x=>x.status==="active").slice(0,12).map(x=>({key:x.fact_key,value:x.fact_value,confidence:x.confidence})),episodes:detail.episodes.slice(0,8).map(x=>({type:x.event_type,summary:x.summary,outcome:x.outcome,happened_at:x.happened_at})),leads:detail.leads.slice(0,5).map(x=>({car_id:x.car_id,status:x.status,message:clean(x.message,300)}))};
    try{
      const out=await env.AI.run("@cf/zai-org/glm-4.7-flash",{messages:[{role:"system",content:"Tóm tắt hồ sơ chăm sóc khách hàng showroom bằng tiếng Việt, tối đa 5 câu. Chỉ dùng JSON bằng chứng. Không suy đoán, không thêm dữ liệu cá nhân, không đưa lời khuyên pháp lý/tài chính. Nêu nhu cầu, xe quan tâm, tương tác gần nhất và việc follow-up đã được ghi nhận nếu có."},{role:"user",content:JSON.stringify(evidence)}],max_tokens:450,temperature:0.1});
      const ai=clean(out?.choices?.[0]?.message?.content||out?.response,1200);if(ai){summary=ai;model="@cf/zai-org/glm-4.7-flash";}
    }catch(error){console.warn("customer_care_ai_summary_fallback",clean(error?.message||error,300));}
  }
  await env.DB.prepare(`INSERT INTO xtra_customer_care(customer_id,ai_summary,updated_by,updated_at) VALUES (?,?,'ai-customer-agent',CURRENT_TIMESTAMP)
    ON CONFLICT(customer_id) DO UPDATE SET ai_summary=excluded.ai_summary,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(id,summary).run();
  await env.DB.prepare("INSERT INTO xtra_customer_care_audit(customer_id,actor,action,summary) VALUES (?,'ai-customer-agent','summary_update',?)").bind(id,clean(`model=${model}; ${summary}`,500)).run();
  return json({ok:true,customer_id:id,summary,model});
}

async function updateStatus(request,env,id){
  const body=await request.json().catch(()=>null),status=clean(body?.status,30).toLowerCase();
  if(!STATUSES.has(status))return json({error:"Trạng thái xe không hợp lệ"},400);
  const saved=await saveCar(env.DB,{status},{id,mode:"update",actor:"telegram-mini-app"});
  if(!saved.ok)return json({error:saved.error},saved.status||400);
  return json({ok:true,id,status,car:saved.car});
}
export async function handleTelegramMiniAppApi(request,env){
  const u=new URL(request.url);
  if(!u.pathname.startsWith(BASE+"/")&&u.pathname!==BASE)return null;
  if(!env.DB)return json({error:"D1 chưa được kết nối"},503);
  const auth=await authenticate(request,env);
  if(!auth.ok)return json({error:auth.reason==="forbidden"?"Forbidden":"Unauthorized"},auth.reason==="forbidden"?403:401);
  if(u.pathname===BASE+"/session"&&request.method==="GET")return json({ok:true,user:{id:auth.user.id,first_name:clean(auth.user.first_name,120),username:clean(auth.user.username,120)}});
  if(u.pathname===BASE+"/cars"&&request.method==="GET")return listCars(request,env);
  if(u.pathname===BASE+"/customers"&&request.method==="GET")return listCustomers(request,env);
  const customer=u.pathname.match(/^\/api\/telegram\/mini\/v1\/customers\/(cus_[A-Za-z0-9-]{20,80})$/);
  if(customer&&request.method==="GET")return customerDetail(env,customer[1]);
  if(customer&&request.method==="PATCH")return updateCustomerCare(request,env,customer[1]);
  const customerSummary=u.pathname.match(/^\/api\/telegram\/mini\/v1\/customers\/(cus_[A-Za-z0-9-]{20,80})\/ai-summary$/);
  if(customerSummary&&request.method==="POST")return summarizeCustomer(env,customerSummary[1]);
  const detail=u.pathname.match(/^\/api\/telegram\/mini\/v1\/cars\/([A-Za-z0-9_-]{3,81})$/);
  if(detail&&request.method==="GET")return carDetail(env,detail[1]);
  if(detail&&request.method==="PATCH")return updateCar(request,env,detail[1]);
  const gallery=u.pathname.match(/^\/api\/telegram\/mini\/v1\/cars\/([A-Za-z0-9_-]{3,81})\/images\/order$/);
  if(gallery&&request.method==="PUT")return reorderGallery(request,env,gallery[1]);
  const statusMatch=u.pathname.match(/^\/api\/telegram\/mini\/v1\/cars\/([A-Za-z0-9_-]{3,81})\/status$/);
  if(statusMatch&&request.method==="PATCH")return updateStatus(request,env,statusMatch[1]);
  return json({error:"Not Found"},404);
}
