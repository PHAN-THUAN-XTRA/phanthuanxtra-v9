import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";

const accountId=process.env.CLOUDFLARE_ACCOUNT_ID||"";
const primary=process.env.CLOUDFLARE_API_TOKEN||"";
const backup=process.env.CLOUDFLARE_BACKUP_API_TOKEN||"";
const zoneName=process.env.ZONE_NAME||"phanthuanxtra.com";
const prodWorker=process.env.WORKER_NAME||"phanthuanxtra-v2";
if(!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
if(!primary&&!backup) throw new Error("Missing Cloudflare API token");
const tokens=[["primary",primary],["backup",backup]].filter(([,v])=>v);
function raw(path,token){const out=execFileSync("curl",["-sS","-H",`Authorization: Bearer ${token}`,"-w","\n__STATUS__%{http_code}",`https://api.cloudflare.com/client/v4${path}`],{encoding:"utf8"});const i=out.lastIndexOf("\n__STATUS__");const text=out.slice(0,i);const status=Number(out.slice(i+12).trim());let body;try{body=JSON.parse(text)}catch{body={raw:"[non-json response]"}}return{status,body};}
function get(path){const attempts=[];for(const [name,t] of tokens){const r=raw(path,t);attempts.push({token:name,status:r.status,success:r.body?.success===true});if(r.status>=200&&r.status<300&&r.body?.success!==false)return{ok:true,token:name,status:r.status,body:r.body};if(![401,403].includes(r.status))break;}return{ok:false,attempts};}
function clean(x){if(Array.isArray(x))return x.map(clean);if(!x||typeof x!=="object")return x;const o={};for(const[k,v]of Object.entries(x)){if(/secret|token|password|private.?key|api.?key/i.test(k))o[k]="[REDACTED]";else o[k]=clean(v)}return o}
function result(path){const r=get(path);return r.ok?{status:r.status,token_source:r.token,result:clean(r.body.result),result_info:clean(r.body.result_info)}:{unavailable:true,attempts:r.attempts};}
const report={audit:"CF-MACHINE-001",generated_at:new Date().toISOString(),mutations:0,account_id:accountId,production:{worker:prodWorker,zone:zoneName},resources:{}};
report.resources.workers=result(`/accounts/${accountId}/workers/scripts`);
report.resources.d1=result(`/accounts/${accountId}/d1/database`);
report.resources.r2=result(`/accounts/${accountId}/r2/buckets`);
report.resources.kv=result(`/accounts/${accountId}/storage/kv/namespaces`);
report.resources.queues=result(`/accounts/${accountId}/queues`);
report.resources.ai_gateway=result(`/accounts/${accountId}/ai-gateway/gateways`);
report.resources.ai_search=result(`/accounts/${accountId}/ai-search/instances`);
const zones=get(`/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=50`);
const zone=zones.ok?(zones.body.result||[]).find(z=>z.name===zoneName):null;
report.resources.zone=zone?clean({id:zone.id,name:zone.name,status:zone.status}):{unavailable:true};
report.resources.routes=zone?.id?result(`/zones/${zone.id}/workers/routes`):{unavailable:true};
report.resources.production_worker_settings=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(prodWorker)}/settings`);
report.resources.production_worker_deployments=result(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(prodWorker)}/deployments`);
const source=readFileSync("src/ai-chat.js","utf8");
const gateway=readFileSync("developer-gateway/src/dual-gateway.js","utf8");
report.source_evidence={website_ai_run_calls:(source.match(/\.AI\.run\(/g)||[]).length,developer_gateway_ai_run_calls:(gateway.match(/\.AI\.run\(/g)||[]).length,website_primary_model:"@cf/zai-org/glm-4.7-flash",website_fallback_model:"@cf/meta/llama-3.2-3b-instruct"};
mkdirSync("cloudflare-audit",{recursive:true});
writeFileSync("cloudflare-audit/report.json",JSON.stringify(report,null,2));
const queues=report.resources.queues?.result;
const qnames=Array.isArray(queues)?queues.map(q=>q.queue_name||q.name).filter(Boolean):[];
console.log("CF-MACHINE-001 read-only audit complete");
console.log("Queues:",qnames.length?qnames.join(", "):report.resources.queues?.unavailable?"UNAVAILABLE":"none");
console.log("AI Gateway:",report.resources.ai_gateway?.unavailable?"UNAVAILABLE":"READ");
console.log("AI Search:",report.resources.ai_search?.unavailable?"UNAVAILABLE":"READ");
console.log("Mutations: 0");
