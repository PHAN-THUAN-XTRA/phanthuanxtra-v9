const text=(v,n=20000)=>String(v??"").trim().slice(0,n);
const STATUSES=new Set(["draft","published","archived"]);
export const validPostSlug=v=>/^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$/.test(String(v??""));
export function slugify(v){return text(v,160).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120)}
function tags(v){if(Array.isArray(v))return v.slice(0,30).map(x=>text(x,80)).filter(Boolean);try{const x=JSON.parse(v||"[]");return Array.isArray(x)?x:[]}catch{return[]}}
export function normalizePostPayload(body={},existing={}){
 const title=text(body.title??existing.title,240),content=text(body.content??existing.content,100000),slug=slugify(body.slug??existing.slug??title);
 const status=text(body.status??existing.status??"draft",20).toLowerCase();
 if(!title)return{error:"title là bắt buộc"};if(!content)return{error:"content là bắt buộc"};if(!validPostSlug(slug))return{error:"slug không hợp lệ"};if(!STATUSES.has(status))return{error:"status phải là draft, published hoặc archived"};
 return{value:{title,slug,excerpt:text(body.excerpt??existing.excerpt,800),content,cover_image:text(body.cover_image??existing.cover_image,2000),category:text(body.category??existing.category,100),tags:tags(body.tags??body.tags_json??existing.tags_json),status}};
}
export function postView(row){if(!row)return null;return{...row,tags:tags(row.tags_json)}}
export async function listPosts(db,{status="",q="",limit=100,publicOnly=false}={}){
 let sql="SELECT * FROM posts WHERE 1=1",args=[];if(publicOnly){sql+=" AND status='published'"}else if(status){sql+=" AND status=?";args.push(status)}
 if(q){sql+=" AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ? OR category LIKE ?)";const x=`%${text(q,120)}%`;args.push(x,x,x,x)}
 sql+=" ORDER BY COALESCE(published_at,created_at) DESC,id DESC LIMIT ?";args.push(Math.min(Math.max(Number(limit)||100,1),200));
 const r=await db.prepare(sql).bind(...args).all();return(r.results||[]).map(postView);
}
export async function getPost(db,idOrSlug,{publicOnly=false}={}){
 const key=text(idOrSlug,160);const numeric=/^\d+$/.test(key);let sql=`SELECT * FROM posts WHERE ${numeric?"id":"slug"}=?`;if(publicOnly)sql+=" AND status='published'";
 return postView(await db.prepare(sql).bind(numeric?Number(key):key).first());
}
export async function savePost(db,body,{id=null,mode="create",actor="cms"}={}){
 const existing=mode==="update"?await db.prepare("SELECT * FROM posts WHERE id=?").bind(Number(id)).first():{};
 if(mode==="update"&&!existing)return{ok:false,status:404,error:"Không tìm thấy bài viết"};
 const parsed=normalizePostPayload(body,existing);if(parsed.error)return{ok:false,status:400,error:parsed.error};const v=parsed.value;
 const publishAt=v.status==="published"?(existing.published_at||new Date().toISOString()):null;
 try{
  if(mode==="create"){const r=await db.prepare("INSERT INTO posts (title,slug,excerpt,content,cover_image,category,tags_json,status,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(v.title,v.slug,v.excerpt,v.content,v.cover_image,v.category,JSON.stringify(v.tags),v.status,publishAt).run();id=Number(r.meta?.last_row_id)}
  else await db.prepare("UPDATE posts SET title=?,slug=?,excerpt=?,content=?,cover_image=?,category=?,tags_json=?,status=?,published_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(v.title,v.slug,v.excerpt,v.content,v.cover_image,v.category,JSON.stringify(v.tags),v.status,publishAt,Number(id)).run();
  await db.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES (?,?,?,?,?)").bind(text(actor,100),mode==="create"?"create":"update","post",String(id),text(`${v.status}: ${v.title}`,500)).run();
  return{ok:true,status:mode==="create"?201:200,id:Number(id),post:await getPost(db,String(id))};
 }catch(e){if(String(e?.message||e).includes("UNIQUE"))return{ok:false,status:409,error:"Slug bài viết đã tồn tại"};throw e}
}
export async function deletePost(db,id,{actor="cms"}={}){const p=await db.prepare("SELECT id,title FROM posts WHERE id=?").bind(Number(id)).first();if(!p)return{ok:false,status:404,error:"Không tìm thấy bài viết"};await db.prepare("DELETE FROM posts WHERE id=?").bind(Number(id)).run();await db.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES (?,?,?,?,?)").bind(text(actor,100),"delete","post",String(id),text(p.title,500)).run();return{ok:true,id:Number(id)}}
