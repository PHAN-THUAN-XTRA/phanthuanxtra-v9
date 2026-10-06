import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { verifyOwnerChat } from "./backup-telegram-delivery.mjs";

const API="https://api.cloudflare.com/client/v4";
const GRAPHQL=API+"/graphql";
const ZONE_NAME=process.env.ZONE_NAME||"phanthuanxtra.com";
const D1_DATABASE_ID=process.env.D1_DATABASE_ID||"";
const ACCOUNT_ID=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const TOKENS=[
  ["primary",process.env.CLOUDFLARE_API_TOKEN||""],
  ["backup",process.env.CLOUDFLARE_BACKUP_API_TOKEN||""]
].filter(([,v])=>v);
const TELEGRAM_TOKEN=process.env.TELEGRAM_BACKUP_BOT_TOKEN||"";
const TELEGRAM_CHAT_ID=process.env.TELEGRAM_BACKUP_CHAT_ID||"";
const TELEGRAM_OWNER_ID=process.env.TELEGRAM_BACKUP_OWNER_ID||"";
const INTERVAL_MINUTES=30;
const REPORT_PATH=process.env.SECURITY_OPERATOR_REPORT||"security-operator-report.json";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const nowIso=()=>new Date().toISOString();

function clean(v,n=1200){return String(v??"").replace(/\s+/g," ").trim().slice(0,n)}
function sha(v){return crypto.createHash("sha256").update(String(v)).digest("hex")}
function pct(a,b){return b>0?Math.round((a/b)*10000)/100:0}
function safeJson(x){try{return JSON.stringify(x)}catch{return "{}"}}
function sanitizeAnalyticsError(v){
  let s=clean(v,300);
  const marker="Actor '";
  const start=s.indexOf(marker);
  if(start>=0){
    const end=s.indexOf("'",start+marker.length);
    if(end>start)s=s.slice(0,start)+"Cloudflare API token"+s.slice(end+1);
  }
  const tokenPrefix="com.cloudflare.api.token.";
  const idx=s.indexOf(tokenPrefix);
  if(idx>=0){
    let end=idx+tokenPrefix.length;
    while(end<s.length&&/[a-z0-9]/i.test(s[end]))end++;
    s=s.slice(0,idx)+"Cloudflare API token"+s.slice(end);
  }
  return s;
}

export function classifySecuritySignals({healthOk,homeOk,totalRequests=0,error5xx=0,wafEvents=0,analyticsOk=true,analyticsError="",wafTelemetryOk=true,wafTelemetryError=""}){
  const errorRate=pct(error5xx,totalRequests);
  const findings=[];
  if(!healthOk)findings.push({key:"health-endpoint-down",severity:"critical",summary:"/api/health không phản hồi 200 sau retry"});
  if(!homeOk)findings.push({key:"homepage-down",severity:"critical",summary:"Trang chủ không phản hồi 200 sau retry"});
  if(!analyticsOk)findings.push({key:"security-telemetry-unavailable",severity:"high",summary:analyticsError||"Cloudflare Security Analytics không khả dụng"});
  else if(!wafTelemetryOk)findings.push({key:"waf-telemetry-unavailable",severity:"high",summary:wafTelemetryError||"Cloudflare Security Events telemetry không khả dụng"});
  if(totalRequests>=20&&error5xx>=20&&errorRate>=10)findings.push({key:"worker-5xx-critical",severity:"critical",summary:`Tỷ lệ 5xx cao: ${errorRate}% (${error5xx}/${totalRequests})`});
  else if(totalRequests>=20&&error5xx>=10&&errorRate>=5)findings.push({key:"worker-5xx-high",severity:"high",summary:`Tỷ lệ 5xx tăng: ${errorRate}% (${error5xx}/${totalRequests})`});
  if(wafEvents>=500)findings.push({key:"waf-spike-critical",severity:"critical",summary:`Cloudflare ghi nhận ${wafEvents} security events trong ~${INTERVAL_MINUTES} phút`});
  else if(wafEvents>=100)findings.push({key:"waf-spike-high",severity:"high",summary:`Cloudflare ghi nhận ${wafEvents} security events trong ~${INTERVAL_MINUTES} phút`});
  return {errorRate,findings};
}

async function cfFetch(path,{method="GET",body=null}={}){
  const attempts=[];
  for(const [name,token] of TOKENS){
    try{
      const r=await fetch(path.startsWith("http")?path:API+path,{
        method,
        headers:{Authorization:`Bearer ${token}`,"content-type":"application/json","user-agent":"PTX-Security-Operator/1.0"},
        body:body==null?undefined:JSON.stringify(body),
        signal:AbortSignal.timeout(20000)
      });
      const text=await r.text();
      let data=null;try{data=JSON.parse(text)}catch{data={raw:clean(text,300)}}
      attempts.push({token:name,status:r.status,success:data?.success!==false});
      if(r.ok&&data?.success!==false)return{ok:true,token:name,status:r.status,data};
      if(![401,403].includes(r.status))break;
    }catch(error){attempts.push({token:name,error:clean(error?.message||error)})}
  }
  return{ok:false,attempts};
}

async function probe(url,attempts=3){
  let last={url,ok:false,status:0};
  for(let i=1;i<=attempts;i++){
    try{
      const start=Date.now();
      const r=await fetch(url,{headers:{"user-agent":"PTX-Security-Operator/1.0","cache-control":"no-cache"},redirect:"follow",signal:AbortSignal.timeout(10000)});
      last={url,status:r.status,ok:r.status===200,ms:Date.now()-start,content_type:r.headers.get("content-type")||null,attempt:i};
      await r.body?.cancel?.().catch?.(()=>{});
      if(last.ok)return last;
    }catch(error){last={url,ok:false,status:0,error:clean(error?.message||error),attempt:i}}
    if(i<attempts)await sleep(i*1000);
  }
  return last;
}

async function zoneId(){
  const r=await cfFetch(`/zones?name=${encodeURIComponent(ZONE_NAME)}&status=active&per_page=50`);
  const id=r.ok?r.data?.result?.find?.(z=>z?.name===ZONE_NAME)?.id:null;
  return {ok:Boolean(id),id:id||null,meta:r.ok?{token:r.token,status:r.status}:{attempts:r.attempts}};
}

async function graphqlQuery(query,variables,preferredToken=null){
  const ordered=preferredToken
    ? [...TOKENS].sort(([a],[b])=>a===preferredToken?-1:b===preferredToken?1:0)
    : TOKENS;
  const attempts=[];
  for(const [name,token] of ordered){
    try{
      const response=await fetch(GRAPHQL,{
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"content-type":"application/json","user-agent":"PTX-Security-Operator/1.0"},
        body:JSON.stringify({query,variables}),
        signal:AbortSignal.timeout(20000)
      });
      const body=await response.json().catch(()=>({}));
      const errors=Array.isArray(body?.errors)?body.errors.map(e=>sanitizeAnalyticsError(e?.message||e)):[];
      attempts.push({token:name,status:response.status,errors});
      if(response.ok&&errors.length===0&&body?.data)return{ok:true,token:name,status:response.status,attempts,data:body.data};
    }catch(error){
      attempts.push({token:name,error:sanitizeAnalyticsError(error?.message||error)});
    }
  }
  const messages=attempts.flatMap(x=>Array.isArray(x.errors)?x.errors:(x.error?[x.error]:[]));
  return{ok:false,attempts,errors:[...new Set(messages)].slice(0,4)};
}

async function graphql(zoneTag,start,end){
  // Keep request/error analytics independent from Security Events so a dataset-specific
  // authorization problem cannot blind the entire monitor.
  const httpQuery=`query SecurityOperatorHttp($zoneTag: string, $start: Time, $end: Time) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        all: httpRequestsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball" }) { count }
        e5: httpRequestsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball", edgeResponseStatus_geq: 500, edgeResponseStatus_lt: 600 }) { count }
      }
    }
  }`;
  const variables={zoneTag,start,end};
  const http=await graphqlQuery(httpQuery,variables);
  const httpZone=http.ok?(http.data?.viewer?.zones?.[0]||{}):{};
  const sum=a=>(Array.isArray(a)?a:[]).reduce((n,x)=>n+Number(x?.count||0),0);

  // Cloudflare documents firewallEventsAdaptive as the Security Events dataset.
  // Fetch raw sampled events separately; a 1000-row cap still preserves our >=500
  // critical threshold while avoiding reliance on firewallEventsAdaptiveGroups access.
  const wafQuery=`query SecurityOperatorWaf($zoneTag: string, $start: Time, $end: Time) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        waf: firewallEventsAdaptive(
          limit: 1000
          filter: { datetime_geq: $start, datetime_lt: $end }
          orderBy: [datetime_DESC]
        ) { action }
      }
    }
  }`;
  const waf=await graphqlQuery(wafQuery,variables,http.ok?http.token:null);
  const wafZone=waf.ok?(waf.data?.viewer?.zones?.[0]||{}):{};
  const wafRows=Array.isArray(wafZone.waf)?wafZone.waf:[];
  const wafByAction={};
  for(const event of wafRows){
    const action=String(event?.action||"unknown");
    wafByAction[action]=(wafByAction[action]||0)+1;
  }

  return{
    ok:http.ok,
    token:http.token||null,
    status:http.status||null,
    attempts:http.attempts||[],
    errors:http.errors||[],
    totalRequests:http.ok?sum(httpZone.all):0,
    error5xx:http.ok?sum(httpZone.e5):0,
    wafOk:waf.ok,
    wafToken:waf.token||null,
    wafAttempts:waf.attempts||[],
    wafErrors:waf.errors||[],
    wafEvents:waf.ok?wafRows.length:0,
    wafByAction
  };
}

async function d1(sql,params=[]){
  if(!ACCOUNT_ID||!D1_DATABASE_ID)return{ok:false,reason:"d1_config_missing"};
  return cfFetch(`/accounts/${ACCOUNT_ID}/d1/database/${encodeURIComponent(D1_DATABASE_ID)}/query`,{method:"POST",body:{sql,params}});
}

async function incidentRow(key){
  const q=await d1("SELECT signal_key,state,severity,fingerprint,last_notified_at,last_seen_at FROM security_operator_state WHERE signal_key=? LIMIT 1",[key]);
  if(!q.ok)return null;
  return q.data?.result?.flatMap?.(x=>x?.results||[])?.[0]||null;
}

async function upsertIncident(finding,fingerprint){
  const q=await d1(`INSERT INTO security_operator_state
    (signal_key,state,severity,fingerprint,summary,first_seen_at,last_seen_at,occurrences)
    VALUES (?,'active',?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1)
    ON CONFLICT(signal_key) DO UPDATE SET
      state='active',severity=excluded.severity,fingerprint=excluded.fingerprint,summary=excluded.summary,
      last_seen_at=CURRENT_TIMESTAMP,occurrences=security_operator_state.occurrences+1`,
    [finding.key,finding.severity,fingerprint,finding.summary]);
  return q.ok;
}
async function markNotified(key){
  const q=await d1("UPDATE security_operator_state SET last_notified_at=CURRENT_TIMESTAMP WHERE signal_key=?",[key]);
  return q.ok;
}
async function markRecovered(key){
  const q=await d1("UPDATE security_operator_state SET state='recovered',last_seen_at=CURRENT_TIMESTAMP WHERE signal_key=? AND state='active'",[key]);
  return q.ok;
}

function hoursSince(s){
  const t=Date.parse(String(s||""));
  return Number.isFinite(t)?(Date.now()-t)/3600000:Infinity;
}

async function telegram(text){
  if(!TELEGRAM_TOKEN||!TELEGRAM_CHAT_ID||!TELEGRAM_OWNER_ID)throw new Error("Owner Telegram configuration missing");
  const api=async(method,fields)=>{
    const r=await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`,{method:"POST",body:new URLSearchParams(fields),signal:AbortSignal.timeout(30000)});
    const d=await r.json().catch(()=>null);
    if(!r.ok||d?.ok!==true)throw new Error(`Telegram ${method} failed HTTP ${r.status}`);
    return d.result;
  };
  verifyOwnerChat(await api("getChat",{chat_id:TELEGRAM_CHAT_ID}),TELEGRAM_OWNER_ID);
  const sent=await api("sendMessage",{chat_id:TELEGRAM_CHAT_ID,text:String(text).slice(0,3900),disable_web_page_preview:"true"});
  verifyOwnerChat(sent.chat,TELEGRAM_OWNER_ID);
  return sent?.message_id||null;
}

function incidentMessage(finding,ctx){
  const sev=finding.severity==="critical"?"🚨 CRITICAL":"⚠️ HIGH";
  const recommendation=finding.key==="security-telemetry-unavailable"
    ?"Cần kiểm tra Cloudflare Analytics Read và resource scope của token giám sát. Đây là sửa quyền telemetry, không tự nâng gói trả phí."
    :finding.key==="waf-telemetry-unavailable"
      ?"Khuyến nghị: kiểm tra quyền Analytics Read/resource scope cho Security Events. Không tự nâng gói, đổi WAF hoặc block IP."
      :finding.key.startsWith("waf-")
        ?"Khuyến nghị: kiểm tra top nguồn/path trong Cloudflare Security Events. Không tự bật Under Attack Mode hoặc block IP để tránh false positive."
      :finding.key.includes("5xx")
        ?"Khuyến nghị: kiểm tra deploy gần nhất, Worker logs và Cloudflare status. Không tự rollback nếu chưa xác định commit lỗi."
        :"Khuyến nghị: kiểm tra route/Worker deployment và Cloudflare status; giữ nguyên dữ liệu D1/R2.";
  return `${sev} · PHAN THUẦN XTRA SECURITY OPERATOR
${finding.summary}

Thời điểm: ${ctx.generated_at}
Requests ~${INTERVAL_MINUTES}m: ${ctx.analytics.totalRequests ?? "n/a"}
5xx ~${INTERVAL_MINUTES}m: ${ctx.analytics.error5xx ?? "n/a"}
WAF events ~${INTERVAL_MINUTES}m: ${ctx.analytics.wafEvents ?? "n/a"}
Health: ${ctx.probes.health.ok?"OK":"FAIL"}
Homepage: ${ctx.probes.home.ok?"OK":"FAIL"}

${recommendation}
Agent đã ghi trạng thái vào D1 và sẽ tránh gửi lặp trừ khi mức độ thay đổi hoặc sự cố kéo dài.`;
}

function recoveryMessage(row){
  return `✅ PHAN THUẦN XTRA SECURITY OPERATOR · RECOVERED
Tín hiệu: ${row.signal_key}
Mức trước đó: ${row.severity}
Hệ thống hiện không còn phát hiện tín hiệu này trong lần kiểm tra mới nhất.
Thời điểm: ${nowIso()}`;
}

export async function runSecurityOperator(){
  const generated_at=nowIso();
  const [health,home]=await Promise.all([
    probe("https://phanthuanxtra.com/api/health"),
    probe("https://phanthuanxtra.com/")
  ]);
  const zone=await zoneId();
  const end=new Date();
  const start=new Date(end.getTime()-INTERVAL_MINUTES*60*1000);
  const analytics=zone.ok?await graphql(zone.id,start.toISOString(),end.toISOString()):{ok:false,reason:"zone_unavailable"};
  const analyticsError=analytics.ok?"":(analytics.errors?.[0]||analytics.reason||"Cloudflare Security Analytics không khả dụng");
  const wafTelemetryError=analytics.wafOk?"":(analytics.wafErrors?.[0]||"Cloudflare Security Events telemetry không khả dụng");
  const metrics={
    healthOk:health.ok,homeOk:home.ok,
    analyticsOk:analytics.ok===true,analyticsError,
    wafTelemetryOk:analytics.wafOk===true,wafTelemetryError,
    totalRequests:analytics.ok?analytics.totalRequests:0,
    error5xx:analytics.ok?analytics.error5xx:0,
    wafEvents:analytics.wafOk?analytics.wafEvents:0
  };
  const classification=classifySecuritySignals(metrics);
  const findings=classification.findings;
  const report={
    schema:1,generated_at,mode:"free-first",mutations:["D1 incident-state only","Telegram owner notification only"],
    protections:{automatic:["3x public retry before incident","D1 dedupe","owner-verified Telegram","existing Worker webhook self-heal","existing durable queue recovery"],approval_required:["production rollback","firewall rule changes","Under Attack Mode","paid-plan upgrade"]},
    probes:{health,home},zone,analytics,classification,findings,notifications:[],recoveries:[]
  };

  // If state table is not yet available, fail closed on incident dedupe to avoid repeated Telegram spam.
  const tableCheck=await d1("SELECT signal_key FROM security_operator_state LIMIT 1");
  report.state_store={ok:tableCheck.ok};
  if(!tableCheck.ok){
    report.state_store.error="security_operator_state unavailable";
    await writeFile(REPORT_PATH,JSON.stringify(report,null,2));
    if(findings.some(x=>x.severity==="critical")){
      try{report.notifications.push({fallback:true,message_id:await telegram(`🚨 PHAN THUẦN XTRA SECURITY OPERATOR
Không truy cập được D1 state store trong khi có tín hiệu CRITICAL.
Health: ${health.ok?"OK":"FAIL"}
Homepage: ${home.ok?"OK":"FAIL"}
Hãy kiểm tra migration/security operator trước khi cho phép tự động hóa thêm.`)})}catch(error){report.notifications.push({fallback:true,error:clean(error?.message||error)})}
      await writeFile(REPORT_PATH,JSON.stringify(report,null,2));
    }
    return report;
  }

  const activeKeys=new Set(findings.map(x=>x.key));
  for(const finding of findings){
    const fingerprint=sha(safeJson({key:finding.key,severity:finding.severity,summary:finding.summary}));
    const previous=await incidentRow(finding.key);
    await upsertIncident(finding,fingerprint);
    const shouldNotify=!previous||previous.state!=="active"||previous.severity!==finding.severity||previous.fingerprint!==fingerprint||hoursSince(previous.last_notified_at)>=6;
    if(shouldNotify){
      try{
        const message_id=await telegram(incidentMessage(finding,report));
        await markNotified(finding.key);
        report.notifications.push({key:finding.key,severity:finding.severity,message_id});
      }catch(error){report.notifications.push({key:finding.key,severity:finding.severity,error:clean(error?.message||error)})}
    }
  }

  const active=await d1("SELECT signal_key,state,severity FROM security_operator_state WHERE state='active'");
  const rows=active.ok?(active.data?.result||[]).flatMap(x=>x?.results||[]):[];
  for(const row of rows){
    if(activeKeys.has(row.signal_key))continue;
    await markRecovered(row.signal_key);
    try{
      const message_id=await telegram(recoveryMessage(row));
      report.recoveries.push({key:row.signal_key,message_id});
    }catch(error){report.recoveries.push({key:row.signal_key,error:clean(error?.message||error)})}
  }

  await writeFile(REPORT_PATH,JSON.stringify(report,null,2));
  return report;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const report=await runSecurityOperator();
  console.log(JSON.stringify({
    ok:true,generated_at:report.generated_at,
    findings:report.findings.map(x=>({key:x.key,severity:x.severity})),
    notifications:report.notifications.length,recoveries:report.recoveries.length,
    analytics_ok:report.analytics.ok===true,waf_telemetry_ok:report.analytics.wafOk===true,state_store_ok:report.state_store?.ok===true
  }));
}
