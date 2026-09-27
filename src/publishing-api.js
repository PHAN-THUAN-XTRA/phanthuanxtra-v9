import { verifyAdminToken } from './admin-auth.js';
import { getPost, normalizePostPayload } from './post-persistence.js';
import { submitArticles, validateArticle } from './editorial-publishing.js';

const BASE = '/api/publish/v1';
const OWNER = 'gpt-publisher';
const json = (body,status=200) => Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export class PublishingError extends Error { constructor(message,status=400) { super(message);this.status=status; } }
export async function boundedBytes(body,max) {
  if (!body) throw new PublishingError('Nội dung rỗng.');
  const reader=body.getReader(),chunks=[];let size=0,complete=false;
  for(let count=0;count<2048;count++) {
    const part=await reader.read();if(part.done){complete=true;break;}
    size+=part.value.byteLength;
    if(size>max){await reader.cancel();throw new PublishingError('Nội dung vượt giới hạn.',413);}
    chunks.push(part.value);
  }
  if(!complete){await reader.cancel();throw new PublishingError('Quá nhiều phần dữ liệu.',413);}
  const bytes=new Uint8Array(size);let offset=0;
  for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  return bytes;
}
async function readJson(request) {
  try { return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(request.body,150*1024))); }
  catch(error) { if(error instanceof PublishingError)throw error;throw new PublishingError('JSON không hợp lệ.'); }
}
export function allowedOpenAIFileUrl(value) {
  let u;try{u=new URL(value);}catch{return false;}
  if(u.protocol!=='https:'||u.username||u.password||u.port)return false;
  return u.hostname==='files.oaiusercontent.com'||u.hostname.endsWith('.oaiusercontent.com')||
    /^oaisd(?:mnt|sor)pr[a-z0-9-]*\.blob\.core\.windows\.net$/.test(u.hostname)||
    /^(?:oaisdmntpr|sdmntpr)[a-z0-9-]*\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(u.hostname);
}
async function actionImage(refs) {
  if(!Array.isArray(refs)||refs.length!==1||!refs[0]||typeof refs[0]!=='object')
    throw new PublishingError('Cần đúng một ảnh trong openaiFileIdRefs.');
  let link=refs[0].download_link;
  for(let attempt=0;attempt<4;attempt++) {
    if(!allowedOpenAIFileUrl(link))throw new PublishingError('Nguồn ảnh ChatGPT không được phép.');
    const response=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    if([301,302,303,307,308].includes(response.status)) { link=new URL(response.headers.get('location')||'',link).href;continue; }
    if(!response.ok)throw new PublishingError('Ảnh ChatGPT đã hết hạn hoặc không tải được. Gửi lại ảnh.',422);
    return boundedBytes(response.body,10*1024*1024);
  }
  throw new PublishingError('Ảnh chuyển hướng quá nhiều lần.');
}
export async function storePublishingImage(env,bytes) {
  if(!env.IMAGES||!env.MEDIA)throw new PublishingError('Chưa cấu hình xử lý/lưu ảnh.',503);
  if(!bytes.length)throw new PublishingError('Ảnh rỗng.');
  const stream=()=>new Blob([bytes]).stream();
  const info=await env.IMAGES.info(stream());
  if(!info?.width||!info?.height)throw new PublishingError('Tệp không phải ảnh hợp lệ.');
  const output=await env.IMAGES.input(stream()).transform({width:1800,fit:'scale-down'}).output({format:'image/webp',quality:85,metadata:'none'});
  const response=output.response();if(!response.ok)throw new PublishingError('Không chuyển đổi được ảnh.',422);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const key='admin/editorial-'+[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')+'-'+crypto.randomUUID()+'.webp';
  await env.MEDIA.put(key,response.body,{httpMetadata:{contentType:'image/webp',cacheControl:'public,max-age=31536000,immutable'}});
  return {ok:true,key,url:`/media/${key}`,absolute_url:`https://phanthuanxtra.com/media/${key}`,content_type:'image/webp'};
}
async function authentication(request,env) {
  if((await verifyAdminToken(request,env)).ok)return {admin:true};
  const header=request.headers.get('authorization')||'';
  if(env.PUBLISH_API_KEY && header===`Bearer ${env.PUBLISH_API_KEY}`)return {admin:false};
  return null;
}
async function ownedPost(db,id,auth) {
  if(!/^\d+$/.test(String(id)))throw new PublishingError('Mã bài không hợp lệ.');
  if(!auth.admin && !(await db.prepare('SELECT id FROM editorial_jobs WHERE post_id=? AND chat_id=?').bind(Number(id),OWNER).first()))
    throw new PublishingError('Không tìm thấy bài viết.',404);
  const post=await getPost(db,id);if(!post)throw new PublishingError('Không tìm thấy bài viết.',404);return post;
}
const result = post => ({ok:true,id:post.id,post,public_url:post.status==='published'?`https://phanthuanxtra.com/blog/${post.slug}`:null});
export async function handlePublishingApi(request,env) {
  const url=new URL(request.url);
  if(!url.pathname.startsWith(BASE+'/'))return null;
  const auth=await authentication(request,env);if(!auth)return json({error:'Unauthorized'},401);
  try {
    if(!env.DB)throw new PublishingError('D1 chưa được kết nối.',503);
    if(url.pathname===BASE+'/media'&&request.method==='POST') {
      const type=request.headers.get('content-type')||'';
      const bytes=type.startsWith('application/json')?await actionImage((await readJson(request)).openaiFileIdRefs):await boundedBytes(request.body,10*1024*1024);
      return json(await storePublishingImage(env,bytes),201);
    }
    if(url.pathname===BASE+'/posts'&&request.method==='POST') {
      const body=await readJson(request);
      if(!body||typeof body!=='object'||Array.isArray(body))throw new PublishingError('JSON bài viết không hợp lệ.');
      if(!/^[a-zA-Z0-9_-]{16,100}$/.test(body.request_id||''))throw new PublishingError('request_id cần 16–100 ký tự chữ, số, _ hoặc -. Giữ nguyên khi thử lại.');
      if(body.status && body.status!=='draft')throw new PublishingError('Tạo bản nháp trước, sau đó gọi publish.');
      if(body.cover_image && !(await env.MEDIA?.head(body.cover_image.replace(/^\/media\//,''))))throw new PublishingError('Ảnh cover chưa được lưu.');
      try { validateArticle({...body,mode:'draft'},Date.now()); } catch(error) { throw new PublishingError(error.message); }
      if(body.cover_image && (!/^\/media\/[A-Za-z0-9/_.-]+$/.test(body.cover_image)||body.cover_image.includes('..')))throw new PublishingError('Ảnh cover không hợp lệ.');
      const saved=await submitArticles(env.DB,[{...body,mode:'draft'}],{chatId:OWNER,submissionId:body.request_id});
      const post=await getPost(env.DB,saved.jobs[0].post_id);
      return json({...result(post),duplicate:saved.duplicate},saved.duplicate?200:201);
    }
    const match=url.pathname.match(/^\/api\/publish\/v1\/posts\/(\d+)(\/publish)?$/);
    if(!match)throw new PublishingError('Not Found',404);
    const post=await ownedPost(env.DB,match[1],auth);
    if(request.method==='GET'&&!match[2])return json(result(post));
    if(request.method==='PUT'&&!match[2]) {
      if(post.status!=='draft')throw new PublishingError('Chỉ sửa bản nháp qua kết nối này.',409);
      const body=await readJson(request);
      if(!body||typeof body!=='object'||Array.isArray(body))throw new PublishingError('JSON không hợp lệ.');
      if(body.status&&body.status!=='draft')throw new PublishingError('Dùng publish để xuất bản.');
      const parsed=normalizePostPayload({...body,status:'draft'},post);if(parsed.error)throw new PublishingError(parsed.error);
      const p=parsed.value;
      if(p.cover_image && (!/^\/media\/[A-Za-z0-9/_.-]+$/.test(p.cover_image)||p.cover_image.includes('..')||!(await env.MEDIA?.head(p.cover_image.slice(7)))))throw new PublishingError('Ảnh cover không hợp lệ.');
      const saved=await env.DB.batch([
        env.DB.prepare("UPDATE posts SET title=?,slug=?,excerpt=?,content=?,cover_image=?,category=?,tags_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='draft'")
          .bind(p.title,p.slug,p.excerpt,p.content,p.cover_image,p.category,JSON.stringify(p.tags),post.id),
        env.DB.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) SELECT 'publishing-api','update','post',CAST(id AS TEXT),title FROM posts WHERE id=? AND status='draft'").bind(post.id)
      ]);
      if(!Number(saved[0]?.meta?.changes))throw new PublishingError('Bài đã thay đổi trạng thái; tải lại trước khi sửa.',409);
      return json(result(await getPost(env.DB,post.id)));
    }
    if(request.method==='POST'&&match[2]) {
      if(!['draft','published'].includes(post.status))throw new PublishingError('Không thể xuất bản bài đã lưu trữ.',409);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) SELECT 'publishing-api','publish','post',CAST(id AS TEXT),title FROM posts WHERE id=? AND status='draft'").bind(post.id),
        env.DB.prepare("UPDATE posts SET status='published',published_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='draft'").bind(new Date().toISOString(),post.id),
        env.DB.prepare("UPDATE editorial_jobs SET status='published',updated_at=CURRENT_TIMESTAMP WHERE post_id=? AND EXISTS(SELECT 1 FROM posts WHERE id=? AND status='published')").bind(post.id,post.id)
      ]);
      const published=await getPost(env.DB,post.id);
      if(published?.status!=='published')throw new PublishingError('Trạng thái bài đã thay đổi; chưa xuất bản.',409);
      return json(result(published));
    }
    return json({error:'Method Not Allowed'},405);
  } catch(error) {
    if(error instanceof PublishingError)return json({error:error.message},error.status);
    if(String(error.message).includes('UNIQUE'))return json({error:'Slug đã tồn tại.'},409);
    console.error('publishing_api_failed',error?.name||'Error');
    return json({error:'Chưa hoàn tất yêu cầu. Kiểm tra lại trạng thái với cùng request_id.'},500);
  }
}
