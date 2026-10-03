import { canPublishAutoBlog } from "./auto-bot-ai.js";
import { carImages, saveCar } from "./vehicle-persistence.js";

const BASE="/api/telegram/mini/v1";
const MAX_AGE_SECONDS=15*60;
const STATUSES=new Set(["available","reserved","sold","hidden"]);
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
  const match=u.pathname.match(/^\/api\/telegram\/mini\/v1\/cars\/([A-Za-z0-9_-]{3,81})\/status$/);
  if(match&&request.method==="PATCH")return updateStatus(request,env,match[1]);
  return json({error:"Not Found"},404);
}
