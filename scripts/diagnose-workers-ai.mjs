// Read-only diagnostic except for one minimal inference charged to the same account as production.
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const tokens=[process.env.CLOUDFLARE_API_TOKEN,process.env.CLOUDFLARE_BACKUP_API_TOKEN].filter(Boolean);
console.log(`Workers AI diagnostic account suffix: ${account?.slice(-8)||"missing"}`);
for (const token of tokens) {
  try {
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/meta/llama-3.1-8b-instruct`,{
      method:"POST",headers:{Authorization:`Bearer ${token}`,"content-type":"application/json"},
      body:JSON.stringify({prompt:"Reply OK.",max_tokens:4}),signal:AbortSignal.timeout(20000)
    });
    const data=await response.json();
    console.log("Workers AI REST probe:",JSON.stringify({http:response.status,success:data.success,error_codes:(data.errors||[]).map(e=>e.code),error_messages:(data.errors||[]).map(e=>String(e.message||"").slice(0,160)),has_result:!!data.result}));
    if(response.status!==401 && response.status!==403)break;
  } catch(error) {console.log("Workers AI REST probe unavailable:",String(error?.message||error).slice(0,120));}
}
