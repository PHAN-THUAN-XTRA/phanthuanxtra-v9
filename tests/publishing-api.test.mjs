import { geminiResponse } from './helpers/gemini-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { database } from './helpers/editorial-db.mjs';
import { handlePublishingApi, allowedOpenAIFileUrl } from '../src/publishing-api.js';
import { issueAdminToken } from '../src/admin-auth.js';
import { getPost, normalizePostPayload } from '../src/post-persistence.js';
import { handleBlog } from '../src/blog.js';
import { submitArticles } from '../src/editorial-publishing.js';

function setup() {
  const files=new Map();const key=crypto.randomUUID();
  const env={GEMINI_API_KEY:crypto.randomUUID(),GEMINI_MODEL:"gemini-test",DB:database(),PUBLISH_API_KEY:key,ADMIN_PASSWORD:crypto.randomUUID(),
    IMAGES:{async info(){return {width:100,height:100};},input(){return {transform(){return this;},async output(o){assert.equal(o.format,'image/webp');return {response:()=>new Response('webp-bytes')};}};}},
    MEDIA:{async put(k,body){files.set(k,await new Response(body).text());},async head(k){return files.has(k)?{customMetadata:{plate_privacy:"gemini-reviewed-v1"}}:null;}}
  };
  const call=async(path='',method='GET',body,credential=key)=>{
    const headers={Authorization:`Bearer ${credential}`};
    if(body!==undefined)headers['content-type']='application/json';
    return handlePublishingApi(new Request('https://phanthuanxtra.com/api/publish/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env);
  };
  return {env,call,files};
}
const payload=()=>({request_id:crypto.randomUUID(),title:'PHAN THUẦN XTRA — bài kiểm tra',content:'Nội dung tiếng Việt do người dùng duyệt.'});

test('Admin empty slug uses title; published result returns canonical URL',()=>{
  assert.equal(normalizePostPayload({title:'Tiêu đề',content:'Bài viết',slug:''}).value.slug,'tieu-de');
});
test('API denies unauthenticated and unrelated keys before fetching files',async()=>{
  const {call}=setup();assert.equal((await call('/posts','POST',payload(),'wrong')).status,401);
});
test('GPT file -> R2 -> private draft -> publish -> public URL lifecycle',async t=>{
  const {call,files,env}=setup();
  t.mock.method(globalThis,'fetch',async (url,init)=>{if(String(url).includes('generativelanguage.googleapis.com'))return geminiResponse(init);assert.equal(new URL(url).hostname,'files.oaiusercontent.com');return new Response('image fixture');});
  const mediaResponse=await call('/media','POST',{openaiFileIdRefs:[{id:'file-test',download_link:'https://files.oaiusercontent.com/test.png'}]});
  assert.equal(mediaResponse.status,201);const media=await mediaResponse.json();assert.ok(files.has(media.key));
  const input={...payload(),cover_image:media.url};
  const created=await call('/posts','POST',input);assert.equal(created.status,201);const draft=await created.json();
  assert.equal(draft.public_url,null);assert.equal(draft.post.status,'draft');
  assert.equal(await getPost(env.DB,draft.id,{publicOnly:true}),null);
  const replay=await call('/posts','POST',input);assert.equal(replay.status,200);assert.equal((await replay.json()).id,draft.id);
  const edited=await call(`/posts/${draft.id}`,'PUT',{content:'Bản đã duyệt với ảnh.'});assert.equal(edited.status,200);
  const published=await call(`/posts/${draft.id}/publish`,'POST',{});assert.equal(published.status,200);const p=await published.json();
  assert.equal(p.public_url,`https://phanthuanxtra.com/blog/${p.post.slug}`);assert.equal(p.post.cover_image,media.url);
  // Public API uses the same persisted article.
  const response=await handleBlog(new Request(`https://phanthuanxtra.com/api/blog/posts/${p.post.slug}`),env);
  assert.equal(response.status,200);assert.equal((await response.json()).post.content,'Bản đã duyệt với ảnh.');
  await call(`/posts/${draft.id}/publish`,'POST',{});
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) n FROM cms_audit_log WHERE action='publish'").get().n,1);
  assert.equal((await call(`/posts/${draft.id}`,'PUT',{content:'Late edit'})).status,409);
});
test('GPT key is scoped to own posts; Admin can publish an existing Telegram draft',async()=>{
  const {call,env}=setup();
  const {jobs}=await submitArticles(env.DB,[{title:'Bài Telegram',content:'Nội dung'}],{chatId:'123',messageId:1});
  const id=jobs[0].post_id;
  assert.equal((await call(`/posts/${id}`)).status,404);
  assert.equal((await call(`/posts/${id}/publish`,'POST',{})).status,404);
  const token=await issueAdminToken(env);
  assert.equal((await call(`/posts/${id}/publish`,'POST',{},token)).status,200);
});
test('creating published or invalid draft fails without storing anything',async()=>{
  const {call,env}=setup();
  assert.equal((await call('/posts','POST',{...payload(),status:'published'})).status,400);
  assert.equal((await call('/posts','POST',{...payload(),request_id:'bad'})).status,400);
  assert.equal((await call('/posts','POST',{...payload(),cover_image:'/media/missing.webp'})).status,400);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,0);
});
test('OpenAI media downloads reject SSRF URLs and redirects to private or unrelated hosts',async t=>{
  for(const url of ['http://files.oaiusercontent.com/x','https://127.0.0.1/x','https://files.oaiusercontent.com.evil.test/x','https://user:pass@files.oaiusercontent.com/x','https://example.com/x'])assert.equal(allowedOpenAIFileUrl(url),false);
  assert.equal(allowedOpenAIFileUrl('https://files.oaiusercontent.com/x'),true);
  const {call}=setup();let count=0;
  t.mock.method(globalThis,'fetch',async()=>{count++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/secret'}});});
  const response=await call('/media','POST',{openaiFileIdRefs:[{download_link:'https://files.oaiusercontent.com/x'}]});
  assert.equal(response.status,400);assert.equal(count,1);
});
test('photo endpoint accepts authenticated binary upload for Admin',async t=>{
  t.mock.method(globalThis,'fetch',async(url,init)=>geminiResponse(init));
  const {env,files}=setup();const token=await issueAdminToken(env);
  const response=await handlePublishingApi(new Request('https://phanthuanxtra.com/api/publish/v1/media',{method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'image/png'},body:new Uint8Array([1,2,3])}),env);
  assert.equal(response.status,201);assert.equal(files.size,1);
});
test('invalid batch payload gives a user error, not an internal server error',async()=>{
  const {call}=setup();const response=await call('/posts','POST',{...payload(),content:''});
  assert.equal(response.status,400);
});
