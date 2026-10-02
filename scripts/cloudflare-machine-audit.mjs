import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import crypto from "node:crypto";

const accountId=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const primary=process.env.CLOUDFLARE_API_TOKEN||"";
const backup=process.env.CLOUDFLARE_BACKUP_API_TOKEN||"";
const zoneName=process.env.ZONE_NAME||"phanthuanxtra.com";
const prodWorker=process.env.WORKER_NAME||"phanthuanxtra-v2";
if(!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
if(!primary&&!backup) throw new Error("Missing Cloudflare API token");

const tokens=[["primary",primary],["backup",backup]].filter(([,v])=>v);
const API="https://api.cloudflare.com/client/v4";

function decodeCurl(out){
  const marker="\n__STATUS__";
  const i=out.lastIndexOf(marker);
  const text=i>=0?out.slice(0,i):out;
  const status=i>=0?Number(out.slice(i+marker.length).trim()):0;
  let body;
  try{body=JSON.parse(text)}catch{body={raw:"[non-json response]"}}
  return{status,body};
}
function raw(path,token){
  return decodeCurl(execFileSync("curl",["-sS","-H",`Authorization: Bearer ${token}`,"-w","\n__STATUS__%{http_code}",`${API}${path}`],{encoding:"utf8"}));
}
function rawPost(path,token,payload){
  return decodeCurl(execFileSync("curl",[
    "-sS","-X","POST",
    "-H",`Authorization: Bearer ${token}`,
    "-H","Content-Type: application/json",
    "--data",JSON.stringify(payload),
    "-w","\n__STATUS__%{http_code}",
    `${API}${path}`
  ],{encoding:"utf8"}));
}
function get(path){
  const attempts=[];
  for(const [name,t] of tokens){
    const r=raw(path,t);
    attempts.push({token:name,status:r.status,success:r.body?.success===true});
    if(r.status>=200&&r.status<300&&r.body?.success!==false)return{ok:true,token:name,status:r.status,body:r.body};
    if(![401,403].includes(r.status))break;
  }
  return{ok:false,attempts};
}
function postRead(path,payload){
  const attempts=[];
  for(const [name,t] of tokens){
    const r=rawPost(path,t,payload);
    const graphOk=path==="/graphql"?(!r.body?.errors&&Boolean(r.body?.data)):r.body?.success!==false;
    attempts.push({token:name,status:r.status,success:graphOk});
    if(r.status>=200&&r.status<300&&graphOk)return{ok:true,token:name,status:r.status,body:r.body};
    if(![401,403].includes(r.status))break;
  }
  return{ok:false,attempts};
}
function clean(x){
  if(Array.isArray(x))return x.map(clean);
  if(!x||typeof x!=="object")return x;
  const sensitiveObject=x.type==="secret_text"||/secret|token|password|private.?key|api.?key|recovery/i.test(String(x.name||""));
  const o={};
  for(const[k,v]of Object.entries(x)){
    if(/secret|token|password|private.?key|api.?key/i.test(k)||(sensitiveObject&&/^(text|value)$/i.test(k)))o[k]="[REDACTED]";
    else o[k]=clean(v);
  }
  return o;
}
function result(path){
  const r=get(path);
  return r.ok?{status:r.status,token_source:r.token,result:clean(r.body.result),result_info:clean(r.body.result_info)}:{unavailable:true,attempts:r.attempts};
}
function listFrom(resource,key){
  if(!resource||resource.unavailable)return[];
  const v=resource.result;
  if(Array.isArray(v))return v;
  if(key&&Array.isArray(v?.[key]))return v[key];
  return[];
}
function bindingInventory(settings){
  const bindings=settings?.result?.bindings;
  if(!Array.isArray(bindings))return settings?.unavailable?{unavailable:true,attempts:settings.attempts}:[];
  return bindings.filter(b=>b?.name).map(b=>{
    const x={name:b.name,type:b.type||"unknown"};
    for(const k of ["service","environment","database_id","bucket_name","namespace","namespace_id","index_name","hyperdrive_id","queue_name"]){
      if(b[k]!=null)x[k]=b[k];
    }
    return clean(x);
  });
}
function deploymentSummary(dep){
  if(!dep||dep.unavailable)return dep;
  const arr=Array.isArray(dep.result)?dep.result:(Array.isArray(dep.result?.deployments)?dep.result.deployments:[]);
  if(!arr.length)return[];
  return arr.slice(0,3).map(d=>clean({
    id:d.id||null,
    created_on:d.created_on||d.created_at||null,
    source:d.source||null,
    versions:Array.isArray(d.versions)?d.versions.map(v=>({version_id:v.version_id,percentage:v.percentage})):[]
  }));
}
function schedulesSummary(s){
  if(!s||s.unavailable)return s;
  const arr=Array.isArray(s.result)?s.result:(Array.isArray(s.result?.schedules)?s.result.schedules:[]);
  return clean(arr.map(x=>({cron:x.cron,created_on:x.created_on||null,modified_on:x.modified_on||null})));
}
function analytics(scriptName,days){
  const end=new Date();
  const start=new Date(end.getTime()-days*24*60*60*1000);
  const query=`query GetWorkersAnalytics($accountTag: string, $datetimeStart: string, $datetimeEnd: string, $scriptName: string) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        workersInvocationsAdaptive(limit: 1, filter: {
          scriptName: $scriptName,
          datetime_geq: $datetimeStart,
          datetime_leq: $datetimeEnd
        }) {
          sum { requests errors subrequests }
        }
      }
    }
  }`;
  const r=postRead("/graphql",{query,variables:{
    accountTag:accountId,
    datetimeStart:start.toISOString(),
    datetimeEnd:end.toISOString(),
    scriptName
  }});
  if(!r.ok)return{unavailable:true,attempts:r.attempts};
  const rows=r.body?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive||[];
  const sum=rows.reduce((a,row)=>({
    requests:a.requests+Number(row?.sum?.requests||0),
    errors:a.errors+Number(row?.sum?.errors||0),
    subrequests:a.subrequests+Number(row?.sum?.subrequests||0)
  }),{requests:0,errors:0,subrequests:0});
  return{days,start:start.toISOString(),end:end.toISOString(),...sum};
}


function d1Schema(databaseId){
  const r=postRead(`/accounts/${accountId}/d1/database/${encodeURIComponent(databaseId)}/query`,{
    sql:"SELECT name,type FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    params:[]
  });
  if(!r.ok)return{unavailable:true,attempts:r.attempts};
  return{status:r.status,token_source:r.token,result:clean(r.body?.result||[])};
}


async function publicProbe(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(url,{method:"GET",redirect:"follow",signal:controller.signal,headers:{"user-agent":"PTX-Cloudflare-Audit/9","accept":"*/*"}});
    const bytes=new Uint8Array(await r.arrayBuffer());
    return{
      url,
      status:r.status,
      ok:r.ok,
      content_type:r.headers.get("content-type"),
      content_length:r.headers.get("content-length"),
      bytes:bytes.byteLength,
      sha256:crypto.createHash("sha256").update(bytes).digest("hex"),
      final_url:r.url
    };
  }catch(error){
    return{url,error:String(error?.name||error?.message||error)};
  }finally{clearTimeout(timer)}
}

async function publicProbeUntilOk(url,{attempts=8,delayMs=15000}={}){
  let last=null;
  for(let i=0;i<attempts;i++){
    last=await publicProbe(url);
    if(last?.status===200&&last?.ok===true)return{...last,attempt:i+1};
    if(i<attempts-1)await new Promise(resolve=>setTimeout(resolve,delayMs));
  }
  return{...(last||{url,error:"probe_failed"}),attempt:attempts};
}

async function publicJsonShape(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(url,{method:"GET",redirect:"follow",signal:controller.signal,headers:{"user-agent":"PTX-Cloudflare-Audit/9","accept":"application/json"}});
    const text=await r.text();
    let body=null; try{body=JSON.parse(text)}catch{}
    const shape=(x,depth=0)=>{
      if(depth>2)return typeof x;
      if(Array.isArray(x))return{x:"array",length:x.length,item_keys:x[0]&&typeof x[0]==="object"?Object.keys(x[0]).sort():[]};
      if(x&&typeof x==="object")return Object.fromEntries(Object.keys(x).sort().map(k=>[k,shape(x[k],depth+1)]));
      return typeof x;
    };
    return{url,status:r.status,ok:r.ok,content_type:r.headers.get("content-type"),json:body!==null,json_shape:body!==null?shape(body):null,bytes:Buffer.byteLength(text)};
  }catch(error){
    return{url,error:String(error?.name||error?.message||error)};
  }finally{clearTimeout(timer)}
}

async function workerContentSummary(name){
  const attempts=[];
  for(const [tokenName,token] of tokens){
    try{
      const r=await fetch(`${API}/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/content/v2`,{
        headers:{Authorization:`Bearer ${token}`,"user-agent":"PTX-Cloudflare-Audit/9"}
      });
      attempts.push({token:tokenName,status:r.status,ok:r.ok});
      if(!r.ok){if(![401,403].includes(r.status))break;continue}
      const bytes=new Uint8Array(await r.arrayBuffer());
      const text=new TextDecoder("utf-8",{fatal:false}).decode(bytes);
      const paths=[...new Set([...text.matchAll(/["'](\/[^"'\\\s]{1,120})["']/g)].map(m=>m[1].split("?")[0]).filter(x=>!/(token|secret|password|api.?key)/i.test(x)))].sort().slice(0,100);
      const title=(text.match(/<title[^>]*>([^<]{0,200})<\/title>/i)?.[1]||"").trim()||null;
      return{
        status:r.status,
        token_source:tokenName,
        content_type:r.headers.get("content-type"),
        bytes:bytes.byteLength,
        sha256:crypto.createHash("sha256").update(bytes).digest("hex"),
        path_literals:paths,
        title,
        indicators:{
          html:/<!doctype html|<html[\s>]/i.test(text),
          fetch_handler:/\bfetch\s*\(|\bfetch\s*:/i.test(text),
          scheduled_handler:/\bscheduled\s*\(|\bscheduled\s*:/i.test(text),
          r2:/\bR2\b|\.put\(|\.get\(|\.delete\(/i.test(text),
          d1:/\.prepare\(|\.batch\(/i.test(text),
          upload:/upload/i.test(text),
          videos:/videos?/i.test(text)
        }
      };
    }catch(error){attempts.push({token:tokenName,error:String(error?.name||error?.message||error)})}
  }
  return{unavailable:true,attempts};
}
async function publicHtmlSummary(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(url,{method:"GET",redirect:"follow",signal:controller.signal,headers:{"user-agent":"PTX-Cloudflare-Audit/9","accept":"text/html,*/*"}});
    const text=await r.text();
    const cleanText=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,300);
    return{
      url,status:r.status,ok:r.ok,bytes:Buffer.byteLength(text),
      title:cleanText(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
      h1:cleanText(text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]),
      script_srcs:[...new Set([...text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]))].slice(0,30),
      stylesheet_hrefs:[...new Set([...text.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map(m=>m[1]))].slice(0,30)
    };
  }catch(error){return{url,error:String(error?.name||error?.message||error)}}finally{clearTimeout(timer)}
}

function quoteSqlIdentifier(name){return '"'+String(name).replaceAll('"','""')+'"'}
function d1CandidateEvidence(databaseId){
  const schema=d1Schema(databaseId);
  if(schema?.unavailable)return schema;
  const schemaRows=(schema.result||[]).flatMap(x=>Array.isArray(x?.results)?x.results:[]);
  const tables=schemaRows.filter(x=>x?.type==="table"&&x?.name&&x.name!=="_cf_KV").map(x=>x.name);
  const counts={};
  const columns={};
  const recency={};
  for(const table of tables){
    const q=quoteSqlIdentifier(table);
    const count=postRead(`/accounts/${accountId}/d1/database/${encodeURIComponent(databaseId)}/query`,{sql:`SELECT COUNT(*) AS rows FROM ${q}`,params:[]});
    counts[table]=count.ok?clean(count.body?.result||[]):{unavailable:true,attempts:count.attempts};
    const info=postRead(`/accounts/${accountId}/d1/database/${encodeURIComponent(databaseId)}/query`,{sql:`PRAGMA table_info(${q})`,params:[]});
    columns[table]=info.ok?(info.body?.result||[]).flatMap(x=>Array.isArray(x?.results)?x.results:[]).map(x=>({name:x.name,type:x.type,notnull:x.notnull,pk:x.pk})):{unavailable:true,attempts:info.attempts};
    if(Array.isArray(columns[table])&&columns[table].some(x=>x.name==="created_at")){
      const time=postRead(`/accounts/${accountId}/d1/database/${encodeURIComponent(databaseId)}/query`,{sql:`SELECT COUNT(*) AS rows, MIN(created_at) AS oldest_created_at, MAX(created_at) AS newest_created_at FROM ${q}`,params:[]});
      recency[table]=time.ok?clean(time.body?.result||[]):{unavailable:true,attempts:time.attempts};
    }
  }
  return{tables,counts,columns,recency};
}

const report={
  audit:"CF-MACHINE-009",
  generated_at:new Date().toISOString(),
  mutations:0,
  read_only_post_queries:"Cloudflare GET, GraphQL analytics, read-only D1 SELECT/PRAGMA, and public HTTP probes",
  account_id:accountId,
  production:{worker:prodWorker,zone:zoneName},
  resources:{}
};

report.resources.workers=result(`/accounts/${accountId}/workers/scripts`);
report.resources.worker_domains=result(`/accounts/${accountId}/workers/domains`);
report.resources.workers_account_subdomain=result(`/accounts/${accountId}/workers/subdomain`);
report.resources.d1=result(`/accounts/${accountId}/d1/database`);
report.resources.r2=result(`/accounts/${accountId}/r2/buckets`);
report.d1_schemas={};
for(const db of listFrom(report.resources.d1)){
  const id=db?.uuid||db?.id;
  if(id)report.d1_schemas[db.name||id]=d1Schema(id);
}
report.resources.kv=result(`/accounts/${accountId}/storage/kv/namespaces`);
report.resources.queues=result(`/accounts/${accountId}/queues`);
report.resources.durable_objects=result(`/accounts/${accountId}/workers/durable_objects/namespaces?per_page=1000`);
report.resources.ai_gateway=result(`/accounts/${accountId}/ai-gateway/gateways`);
report.resources.ai_search_default=result(`/accounts/${accountId}/ai-search/namespaces/default/instances`);
report.resources.vectorize=result(`/accounts/${accountId}/vectorize/v2/indexes`);
report.resources.hyperdrive=result(`/accounts/${accountId}/hyperdrive/configs`);
report.resources.turnstile=result(`/accounts/${accountId}/challenges/widgets`);
report.resources.account_logpush=result(`/accounts/${accountId}/logpush/jobs`);

const zones=get(`/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=50`);
const zone=zones.ok?(zones.body.result||[]).find(z=>z.name===zoneName):null;
report.resources.zone=zone?clean({id:zone.id,name:zone.name,status:zone.status}):{unavailable:true};
report.resources.routes=zone?.id?result(`/zones/${zone.id}/workers/routes`):{unavailable:true};
report.resources.dns=zone?.id?result(`/zones/${zone.id}/dns_records?per_page=500`):{unavailable:true};
report.resources.zone_logpush=zone?.id?result(`/zones/${zone.id}/logpush/jobs`):{unavailable:true};

const r2Buckets=listFrom(report.resources.r2,"buckets");
report.r2_domains={};
for(const bucket of r2Buckets){
  const name=bucket?.name;
  if(!name)continue;
  report.r2_domains[name]={
    custom:result(`/accounts/${accountId}/r2/buckets/${encodeURIComponent(name)}/domains/custom`),
    managed:result(`/accounts/${accountId}/r2/buckets/${encodeURIComponent(name)}/domains/managed`)
  };
}

const workerList=listFrom(report.resources.workers);
const domains=listFrom(report.resources.worker_domains);
const accountSubdomain=report.resources.workers_account_subdomain?.result?.subdomain||null;
report.worker_dependencies={};
for(const worker of workerList){
  const name=worker?.id;
  if(!name)continue;
  const settings=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/settings`);
  const schedules=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/schedules`);
  const deployments=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/deployments`);
  const subdomain=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(name)}/subdomain`);
  const enabled=subdomain?.result?.enabled===true;
  const listedUrl=worker?.subdomain?.url||null;
  const workersDevUrl=listedUrl||(accountSubdomain?`https://${name}.${accountSubdomain}.workers.dev`:null);
  report.worker_dependencies[name]={
    updated_on:worker.updated_on||null,
    deployed_on:worker.deployed_on||null,
    routes:clean(worker.routes||[]),
    custom_domains:clean(domains.filter(d=>d?.service===name).map(d=>({id:d.id,hostname:d.hostname,zone_name:d.zone_name,environment:d.environment||null}))),
    workers_dev:{enabled,previews_enabled:subdomain?.result?.previews_enabled??null,url:workersDevUrl},
    bindings:bindingInventory(settings),
    schedules:schedulesSummary(schedules),
    deployments:deploymentSummary(deployments),
    analytics_1d:analytics(name,1),
    analytics_3d:analytics(name,3),
    analytics_7d:analytics(name,7),
    analytics_30d:analytics(name,30),
    referenced_by_workers:clean(worker.workers||[]),
    tail_consumers:clean(worker.tail_consumers||[]),
    queue_consumers:clean(worker.queues||[])
  };
}

report.service_bindings=[];
for(const [source,w] of Object.entries(report.worker_dependencies)){
  if(!Array.isArray(w.bindings))continue;
  for(const b of w.bindings){
    if(b?.type==="service"&&b?.service){
      report.service_bindings.push({source,binding:b.name,target:b.service,environment:b.environment||null});
    }
  }
}
for(const [name,w] of Object.entries(report.worker_dependencies)){
  w.referenced_by_workers=report.service_bindings.filter(x=>x.target===name).map(x=>({worker:x.source,binding:x.binding,environment:x.environment}));
}


report.phase2_evidence={
  public_probes:{
    homepage:await publicProbe("https://phanthuanxtra.com/"),
    health:await publicProbe("https://phanthuanxtra.com/api/health"),
    business_jets:await publicProbe("https://phanthuanxtra.com/business-jets"),
    robots:await publicProbe("https://phanthuanxtra.com/robots.txt"),
    sitemap:await publicProbe("https://phanthuanxtra.com/sitemap.xml"),
    videos_public:await publicProbe("https://phanthuanxtra.com/videos"),
    videos_v2_workers_dev:await publicProbeUntilOk("https://phanthuanxtra-v2.phanthuanmodelactor.workers.dev/videos"),
    images_worker:await publicProbe("https://phanthuanxtra-images.phanthuanmodelactor.workers.dev/"),
    images_r2_domain:await publicProbe("https://images.phanthuanxtra.com/"),
    apk_r2_domain:await publicProbe("https://downloadai.phanthuanxtra.com/")
  },
  public_json_shapes:{
    images_worker_root:await publicJsonShape("https://phanthuanxtra-images.phanthuanmodelactor.workers.dev/"),
    ask_ai_agent_root:await publicJsonShape("https://ask-ai-agent.phanthuanmodelactor.workers.dev/"),
    ask_ai_api_root:await publicJsonShape("https://ask-ai-api.phanthuanmodelactor.workers.dev/"),
    images_health:await publicJsonShape("https://phanthuanxtra-images.phanthuanmodelactor.workers.dev/health"),
    images_list:await publicJsonShape("https://phanthuanxtra-images.phanthuanmodelactor.workers.dev/list"),
    images_videos:await publicJsonShape("https://phanthuanxtra-images.phanthuanmodelactor.workers.dev/videos")
  },
  worker_content_summaries:{
    phanthuanxtra_images:await workerContentSummary("phanthuanxtra-images"),
    phanthuanxtra_videos:await workerContentSummary("phanthuanxtra-videos"),
    ask_ai_agent:await workerContentSummary("ask-ai-agent"),
    ask_ai_api:await workerContentSummary("ask-ai-api")
  },
  html_summaries:{
    public_videos:await publicHtmlSummary("https://phanthuanxtra.com/videos")
  },
  d1_candidates:{}
};
for(const db of listFrom(report.resources.d1)){
  if(db?.name==="chatbot-db"||db?.name==="luxury-ui-db"){
    report.phase2_evidence.d1_candidates[db.name]=d1CandidateEvidence(db.uuid||db.id);
  }
}

report.resources.production_worker_settings=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(prodWorker)}/settings`);
report.resources.production_worker_deployments=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(prodWorker)}/deployments`);

const prodBindings=bindingInventory(report.resources.production_worker_settings);
const allWorkers=workerList.map(w=>w.id).filter(Boolean);
const managedRoutePatterns=[
  "phanthuanxtra.com/",
  "phanthuanxtra.com/home",
  "phanthuanxtra.com/home/",
  "phanthuanxtra.com/api/blog*",
  "phanthuanxtra.com/blog*",
  "phanthuanxtra.com/api/blog/*",
  "phanthuanxtra.com/blog",
  "phanthuanxtra.com/blog/*",
  "phanthuanxtra.com/*"
];

function workerSignals(name){
  const w=report.worker_dependencies[name]||{};
  const bindings=Array.isArray(w.bindings)?w.bindings:[];
  const schedules=Array.isArray(w.schedules)?w.schedules:[];
  const routes=Array.isArray(w.routes)?w.routes:[];
  const customDomains=Array.isArray(w.custom_domains)?w.custom_domains:[];
  const incoming=Array.isArray(w.referenced_by_workers)?w.referenced_by_workers:[];
  const serviceOut=bindings.filter(b=>b.type==="service");
  const requests1=w.analytics_1d?.requests;
  const requests3=w.analytics_3d?.requests;
  const requests30=w.analytics_30d?.requests;
  const hasKnownTraffic=Number.isFinite(Number(requests30));
  return{
    requests_1d:Number.isFinite(Number(requests1))?Number(requests1):null,
    requests_3d:Number.isFinite(Number(requests3))?Number(requests3):null,
    route_count:routes.length,
    custom_domain_count:customDomains.length,
    cron_count:schedules.length,
    service_binding_out_count:serviceOut.length,
    referenced_by_worker_count:incoming.length,
    requests_30d:hasKnownTraffic?Number(requests30):null,
    analytics_30d_available:hasKnownTraffic,
    updated_on:w.updated_on||null,
    deployed_on:w.deployed_on||null
  };
}

report.decisions={
  keep:[
    {type:"worker",id:prodWorker,reason:"production Worker declared by repository and active deployment controller"},
    ...(allWorkers.includes("phanthuanxtra-developer-gateway")?[{type:"worker",id:"phanthuanxtra-developer-gateway",reason:"repository-managed production Developer Gateway"}]:[]),
    {type:"d1",id:"8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d",name:"phanthuanxtra-db",reason:"repository production DB binding"},
    {type:"r2",id:"phanthuanxtra-media",name:"MEDIA",reason:"repository production media binding"},
    {type:"ai_search",id:"default",name:"AI_SEARCH",reason:"repository production AI Search binding"}
  ],
  managed_by_deployment:managedRoutePatterns.map(pattern=>({type:"worker_route",pattern,worker:prodWorker,reason:"scripts/deploy-cloudflare-api.mjs creates or maintains this route"})),
  candidate_need_final_verify:allWorkers.filter(x=>![prodWorker,"phanthuanxtra-developer-gateway"].includes(x)).map(id=>({type:"worker",id,signals:workerSignals(id),reason:"candidate only; removal requires all dependency and 30-day traffic gates to be clear"})),
  safe_to_remove:[],
  blocked:{}
};

for(const [k,v]of Object.entries({
  durable_objects:report.resources.durable_objects,
  ai_gateway:report.resources.ai_gateway,
  ai_search_default:report.resources.ai_search_default,
  vectorize:report.resources.vectorize,
  hyperdrive:report.resources.hyperdrive,
  turnstile:report.resources.turnstile,
  account_logpush:report.resources.account_logpush,
  zone_logpush:report.resources.zone_logpush
})){
  if(v?.unavailable)report.decisions.blocked[k]="API permission/read unavailable";
}

const source=readFileSync("src/ai-chat.js","utf8");
const gateway=readFileSync("developer-gateway/src/dual-gateway.js","utf8");
report.source_evidence={
  website_ai_run_calls:(source.match(/\.AI\.run\(/g)||[]).length,
  developer_gateway_ai_run_calls:(gateway.match(/\.AI\.run\(/g)||[]).length,
  website_primary_model:"@cf/zai-org/glm-4.7-flash",
  website_fallback_model:"@cf/meta/llama-3.2-3b-instruct",
  repository_managed_workers:[prodWorker,"phanthuanxtra-developer-gateway"],
  production_binding_inventory:prodBindings
};

mkdirSync("cloudflare-audit",{recursive:true});
writeFileSync("cloudflare-audit/report.json",JSON.stringify(report,null,2));

console.log("CF-MACHINE-009 read-only Cloudflare cleanup evidence complete");
console.log("Workers:",allWorkers.length);
for(const id of allWorkers){
  const s=workerSignals(id);
  console.log(`WORKER ${id}: routes=${s.route_count} domains=${s.custom_domain_count} cron=${s.cron_count} service_out=${s.service_binding_out_count} referenced_by=${s.referenced_by_worker_count} requests1d=${s.requests_1d??"UNAVAILABLE"} requests3d=${s.requests_3d??"UNAVAILABLE"} requests30d=${s.requests_30d??"UNAVAILABLE"}`);
}
console.log("D1:",listFrom(report.resources.d1).map(x=>x.name||x.uuid).join(", ")|| (report.resources.d1?.unavailable?"UNAVAILABLE":"none"));
console.log("R2:",r2Buckets.map(x=>x.name).join(", ")|| (report.resources.r2?.unavailable?"UNAVAILABLE":"none"));
console.log("KV:",listFrom(report.resources.kv).map(x=>x.title||x.id).join(", ")|| (report.resources.kv?.unavailable?"UNAVAILABLE":"none"));
console.log("Durable Objects:",listFrom(report.resources.durable_objects).map(x=>x.name||x.id).join(", ")|| (report.resources.durable_objects?.unavailable?"UNAVAILABLE":"none"));
console.log("AI Gateway:",report.resources.ai_gateway?.unavailable?"UNAVAILABLE":"READ");
console.log("AI Search default:",report.resources.ai_search_default?.unavailable?"UNAVAILABLE":"READ");
console.log("Vectorize:",report.resources.vectorize?.unavailable?"UNAVAILABLE":"READ");
console.log("Hyperdrive:",report.resources.hyperdrive?.unavailable?"UNAVAILABLE":"READ");
console.log("Turnstile:",report.resources.turnstile?.unavailable?"UNAVAILABLE":"READ");
console.log("Logpush account:",report.resources.account_logpush?.unavailable?"UNAVAILABLE":"READ");
console.log("Logpush zone:",report.resources.zone_logpush?.unavailable?"UNAVAILABLE":"READ");
console.log("PHASE2_PROBES:",JSON.stringify(report.phase2_evidence?.public_probes||{}));
console.log("PHASE2_JSON_SHAPES:",JSON.stringify(report.phase2_evidence?.public_json_shapes||{}));
console.log("PHASE2_WORKER_CONTENT:",JSON.stringify(report.phase2_evidence?.worker_content_summaries||{}));
console.log("PHASE2_HTML:",JSON.stringify(report.phase2_evidence?.html_summaries||{}));
console.log("SAFE_TO_REMOVE: none (requires final verified approval)");
console.log("Mutations: 0");
