import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base='https://phanthuanxtra.com';
if(!process.env.ADMIN_PASSWORD)throw Error('ADMIN_PASSWORD is required for publishing E2E.');
let session,postId,mediaKey;
async function request(path,options={}) {
  const headers={...(options.headers||{}),...(session?{Authorization:`Bearer ${session}`}:{})};
  const timeoutMs=Number(options.timeoutMs||25000);
  const {timeoutMs:_timeoutMs,...fetchOptions}=options;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(base+path,{...fetchOptions,headers,signal:AbortSignal.timeout(timeoutMs)});
      if(response.status===429&&attempt<2){await new Promise(resolve=>setTimeout(resolve,2000));continue;}
      return response;
    }catch(error){
      if(error?.name==='TimeoutError')throw new Error(`Timed out after ${timeoutMs}ms: ${path}`);
      throw error;
    }
  }
}
async function data(path,method,body) {
  const response=await request(path,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const text=await response.text();
  assert.ok(response.ok,`${method} ${path}: HTTP ${response.status} ${text.slice(0,500)}`);return JSON.parse(text);
}
try{
  const login=await data('/api/admin/login','POST',{password:process.env.ADMIN_PASSWORD});session=login.token;assert.ok(session);
  const bytes=Buffer.from((await readFile('tests/fixtures/vehicle-vision-smoke.jpg.b64','utf8')).trim(),'base64');
  assert.ok(bytes.length>256 && bytes[0]===0xff && bytes[1]===0xd8 && bytes.at(-2)===0xff && bytes.at(-1)===0xd9,'Publishing fixture must be a complete JPEG');
  const upload=await request('/api/publish/v1/media',{method:'POST',headers:{'content-type':'image/jpeg'},body:bytes});
  const uploadText=await upload.text();
  assert.equal(upload.status,201,`Authenticated image upload: HTTP ${upload.status} ${uploadText.slice(0,500)}`);
  const media=JSON.parse(uploadText);mediaKey=media.key;
  assert.equal(media.content_type,'image/webp');
  const canonical=await request(media.url,{headers:{Accept:'image/jpeg'}});assert.equal(canonical.status,200);assert.match(canonical.headers.get('content-type'),/image\/webp/);console.log('Publishing image canonical WebP: PASS');
  const webp=await request(media.url+'?format=webp',{timeoutMs:45000});assert.equal(webp.status,200);assert.match(webp.headers.get('content-type'),/image\/webp/);console.log('Publishing image explicit WebP variant: PASS');
  const avif=await request(media.url+'?format=avif',{timeoutMs:45000});assert.equal(avif.status,200);assert.match(avif.headers.get('content-type'),/image\/avif/);console.log('Publishing image explicit AVIF variant: PASS');
  const input={request_id:crypto.randomUUID(),title:'PHAN THUẦN XTRA — kiểm thử xuất bản',content:'Bài kiểm thử tự động: tạo nháp, ảnh WebP, xuất bản và trả link. Bài sẽ được dọn sau kiểm thử.',cover_image:media.url};
  const draft=await data('/api/publish/v1/posts','POST',input);postId=draft.id;
  assert.equal(draft.post.status,'draft');assert.equal(draft.public_url,null);
  assert.equal((await request('/blog/'+draft.post.slug)).status,404,'Draft must stay private');
  const replay=await data('/api/publish/v1/posts','POST',input);assert.equal(replay.id,postId);assert.equal(replay.duplicate,true);
  const published=await data(`/api/publish/v1/posts/${postId}/publish`,'POST',{});
  assert.equal(published.post.status,'published');assert.equal(published.public_url,base+'/blog/'+published.post.slug);
  const page=await request('/blog/'+published.post.slug+'?publishing_e2e='+Date.now());assert.equal(page.status,200);assert.match(page.headers.get('content-type'),/text\/html.*charset=utf-8/i);
  const html=await page.text();assert.ok(html.includes(input.title));assert.ok(html.includes(media.url));assert.ok(!html.includes('PHAN THUáº¦N'));
  const again=await data(`/api/publish/v1/posts/${postId}/publish`,'POST',{});assert.equal(again.post.published_at,published.post.published_at);
  console.log('Publishing E2E: canonical WebP + explicit cache-safe AVIF/WebP variants -> private draft 404 -> idempotent retry -> publish -> public HTML UTF-8 + cover PASS.');
}finally{
  const errors=[];
  if(postId){try{const r=await request(`/api/admin/posts/${postId}`,{method:'DELETE'});assert.equal(r.status,200);}catch(e){errors.push(e);}}
  if(mediaKey){try{const r=await request('/api/admin/media/'+encodeURIComponent(mediaKey),{method:'DELETE'});assert.equal(r.status,200);}catch(e){errors.push(e);}}
  if(errors.length)throw new AggregateError(errors,'Publishing E2E cleanup failed.');
  if(postId||mediaKey)console.log('Publishing E2E temporary post/media cleanup: PASS.');
}
