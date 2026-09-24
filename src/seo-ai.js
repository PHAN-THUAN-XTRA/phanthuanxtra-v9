const MODEL="@cf/meta/llama-3.1-8b-instruct-fast";
const LIMIT=3;
const GATEWAY={gateway:{id:"default",skipCache:false,cacheTtl:86400},extraHeaders:{"cf-aig-metadata":JSON.stringify({app:"phanthuanxtra",surface:"seo-cron"})}};
const clean=(v,n)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
async function digest(v){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function parse(out){const raw=out?.response||out?.result?.response||out?.text||"";const m=String(raw).match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0])}catch{return null}}
async function generate(env,p){
 const prompt=`Tạo metadata SEO tiếng Việt cho bài PHAN THUẦN XTRA. Chỉ trả JSON {"title":"...","description":"..."}. title tối đa 60 ký tự, description 120-160 ký tự. Không bịa dữ kiện. Tiêu đề: ${clean(p.title,200)}. Tóm tắt: ${clean(p.excerpt,500)}. Nội dung: ${clean(p.content,1800)}`;
 const out=await env.AI.run(MODEL,{messages:[{role:"user",content:prompt}],temperature:.1,max_tokens:220},GATEWAY);
 const x=parse(out)||{};const title=clean(x.title,60),description=clean(x.description,160);
 if(!title||description.length<80)return null;return{title,description}
}
export async function reconcileSeo(env){
 if(!env.DB||!env.AI)return{ok:false,reason:"bindings_unavailable",processed:0};
 const q=await env.DB.prepare("SELECT id,title,excerpt,content,updated_at FROM posts WHERE status='published' ORDER BY COALESCE(updated_at,published_at,created_at) DESC LIMIT 20").all();
 let processed=0,unchanged=0,failed=0;
 for(const p of q.results||[]){
  const fingerprint=await digest(JSON.stringify([p.title,p.excerpt,p.content,p.updated_at]));
  const existing=await env.DB.prepare("SELECT content_hash FROM seo_metadata WHERE resource_type='post' AND resource_id=?").bind(String(p.id)).first();
  if(existing?.content_hash===fingerprint){unchanged++;continue}
  if(processed>=LIMIT)break;
  try{const meta=await generate(env,p);if(!meta){failed++;continue}
   await env.DB.prepare(`INSERT INTO seo_metadata(resource_type,resource_id,seo_title,seo_description,content_hash,model,updated_at) VALUES('post',?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(resource_type,resource_id) DO UPDATE SET seo_title=excluded.seo_title,seo_description=excluded.seo_description,content_hash=excluded.content_hash,model=excluded.model,updated_at=CURRENT_TIMESTAMP`).bind(String(p.id),meta.title,meta.description,fingerprint,MODEL).run();processed++;
  }catch(e){failed++;console.error("seo_ai_post_failed",String(e?.message||e))}
 }
 return{ok:true,processed,unchanged,failed,model:MODEL,limit:LIMIT}
}
export async function seoForPost(db,id){if(!db)return null;return db.prepare("SELECT seo_title,seo_description FROM seo_metadata WHERE resource_type='post' AND resource_id=?").bind(String(id)).first()}
