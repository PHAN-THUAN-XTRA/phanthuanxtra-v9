const clean=(v,n=1000)=>String(v??"").trim().slice(0,n);
const expectedUrl=process.env.TELEGRAM_VIP_WEBHOOK_URL||"https://phanthuanxtra.com/api/telegram/vip-webhook";
const token=clean(process.env.TELEGRAM_VIP_BOT_TOKEN,500);
const secret=clean(process.env.TELEGRAM_VIP_WEBHOOK_SECRET,500);

if(!token) throw new Error("TELEGRAM_VIP_BOT_TOKEN is not configured");
if(!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) throw new Error("TELEGRAM_VIP_WEBHOOK_SECRET is absent or invalid");

async function tg(method,payload={}){
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(payload),
    redirect:"error",
    signal:AbortSignal.timeout(20000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok) throw new Error(`Telegram ${method} failed with HTTP ${response.status}`);
  return data.result;
}

const registration=await tg("setWebhook",{
  url:expectedUrl,
  allowed_updates:["message","channel_post"],
  secret_token:secret,
  drop_pending_updates:false,
});
if(registration!==true) throw new Error("Telegram setWebhook did not confirm success");

const info=await tg("getWebhookInfo",{});
if(clean(info?.url,2000)!==expectedUrl) throw new Error("Telegram VIP webhook URL verification failed");

const smoke=await fetch(expectedUrl,{
  method:"POST",
  headers:{
    "content-type":"application/json",
    "X-Telegram-Bot-Api-Secret-Token":secret,
  },
  body:"{}",
  redirect:"error",
  signal:AbortSignal.timeout(20000),
});
if(smoke.status!==200) throw new Error(`VIP webhook authenticated smoke failed with HTTP ${smoke.status}`);

console.log(JSON.stringify({
  ok:true,
  webhook:"vip",
  url:expectedUrl,
  pending_update_count:Number(info?.pending_update_count||0),
  last_error_date:info?.last_error_date||null,
  last_error_message:clean(info?.last_error_message,300)||null,
  authenticated_smoke_status:smoke.status,
}));
