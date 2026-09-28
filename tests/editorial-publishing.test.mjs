import { geminiResponse } from './helpers/gemini-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { database } from './helpers/editorial-db.mjs';
import { vietnamSchedule, parseArticle, parseBatch, submitArticles, publishDueArticles, changePublication, recentPublications } from '../src/editorial-publishing.js';
import { handleEditorialMessage } from '../src/telegram-editorial.js';
import { handleTelegramRouter, processTelegramUpdate } from '../src/telegram-router.js';
import { getPost } from '../src/post-persistence.js';


const now=Date.parse('2026-09-27T13:00:00Z');
const article={title:'Năng lượng xanh tại Việt Nam',content:'Nội dung tiếng Việt đầy đủ, giữ nguyên thông tin đã cung cấp.'};
const options={chatId:'123',messageId:1,now};
function telegram(t) {
  const messages=[];
  t.mock.method(globalThis,'fetch',async (url,init)=>{
    assert.match(String(url), /api.telegram.org/);
    const body=JSON.parse(init.body); messages.push(body);
    return Response.json({ok:true,result:{message_id:messages.length}});
  }); return messages;
}
function env(DB) { return {DB,TELEGRAM_AUTO_BOT_TOKEN:'test',TELEGRAM_AUTO_PUBLISH_CHAT_IDS:'123',TELEGRAM_WEBHOOK_SECRET:crypto.randomUUID()}; }

test('Vietnam time roundtrip rejects rollover, past time and missing timezone format',()=>{
  assert.equal(vietnamSchedule('2026-09-27 21:30',now),'2026-09-27T14:30:00.000Z');
  for(const date of ['2026-02-30 21:30','2026-09-27 24:30','2026-09-27 19:00','tomorrow','2026-09-27T21:30Z']) assert.throws(()=>vietnamSchedule(date,now));
});
test('parse authored text and mixed batch without requiring a car or AI',()=>{
  assert.deepEqual(parseArticle('Tiêu đề\nĐoạn 1\n\nĐoạn 2'),{title:'Tiêu đề',content:'Đoạn 1\n\nĐoạn 2',mode:'publish',schedule:undefined});
  const batch=parseBatch('/post Bài thứ nhất\nNội dung 1\n---\n/schedule 2026-09-28 09:00\nBài thứ hai\nNội dung 2');
  assert.equal(batch[1].schedule,'2026-09-28 09:00');
  assert.equal(parseBatch(JSON.stringify([article]))[0].title,article.title);
  assert.throws(()=>parseBatch('[]')); assert.throws(()=>parseBatch(JSON.stringify(Array(21).fill(article))));
});
test('validate entire batch before writes; invalid second item leaves nothing',async()=>{
  const DB=database();
  await assert.rejects(submitArticles(DB,[article,{title:'missing'}],options),/Bài 2/);
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,0);
});
test('D1 batch rollback also removes posts and jobs when audit insertion fails',async()=>{
  const DB=database(); DB.sqlite.exec('DROP TABLE cms_audit_log');
  await assert.rejects(submitArticles(DB,[article],options));
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,0);
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM editorial_jobs').get().n,0);
});
test('webhook concurrency creates one post and immutable retry does not overwrite content',async()=>{
  const DB=database();
  await Promise.all([submitArticles(DB,[article],options),submitArticles(DB,[article],options)]);
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,1);
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM cms_audit_log').get().n,1);
  const retried=await submitArticles(DB,[{...article,content:'Changed'}],options);
  assert.equal(retried.duplicate,true);
  assert.equal((await getPost(DB,retried.jobs[0].post_id)).content,article.content);
});
test('scheduled post stays private until due; overlapping cron publishes once and audits once',async()=>{
  const DB=database(),schedule='2026-09-27 21:30',due=Date.parse(vietnamSchedule(schedule,now));
  const {jobs}=await submitArticles(DB,[{...article,mode:'schedule',schedule}],options);
  assert.equal(await getPost(DB,jobs[0].post_id,{publicOnly:true}),null);
  assert.equal((await publishDueArticles({DB},{now:due-1})).published,0);
  await Promise.all([publishDueArticles({DB},{now:due}),publishDueArticles({DB},{now:due})]);
  assert.equal((await getPost(DB,jobs[0].post_id,{publicOnly:true})).content,article.content);
  assert.equal(DB.sqlite.prepare("SELECT count(*) n FROM cms_audit_log WHERE action='publish'").get().n,1);
  assert.equal((await publishDueArticles({DB},{now:due+1000})).published,0);
  // Retry after due must not reject the original now-past scheduled time.
  assert.equal((await submitArticles(DB,[{...article,mode:'schedule',schedule}],{...options,now:due+1000})).duplicate,true);
});
test('cancel is scoped to owning chat and cannot be revived by a replay',async()=>{
  const DB=database(); const {jobs}=await submitArticles(DB,[{...article,mode:'publish'}],options);
  assert.equal(await changePublication(DB,'999',jobs[0].id,'cancel',now),null);
  await changePublication(DB,'123',jobs[0].id,'cancel',now);
  await submitArticles(DB,[{...article,mode:'publish'}],options);
  await publishDueArticles({DB},{now:now+1000});
  assert.equal((await getPost(DB,jobs[0].post_id)).status,'draft');
  assert.equal((await changePublication(DB,'123',jobs[0].id,'publish',now)).status,'cancelled');
});
test('draft can publish explicitly, scheduled jobs cannot be published early by /publish',async()=>{
  const DB=database(); const {jobs}=await submitArticles(DB,[article,{...article,mode:'schedule',schedule:'2026-09-28 09:00'}],options);
  await changePublication(DB,'123',jobs[0].id,'publish',now);
  await changePublication(DB,'123',jobs[1].id,'publish',now);
  await publishDueArticles({DB},{now});
  assert.equal((await getPost(DB,jobs[0].post_id)).status,'published');
  assert.equal((await getPost(DB,jobs[1].post_id)).status,'draft');
});
test('archived or deleted Admin posts are never resurrected by cron',async()=>{
  const DB=database();const {jobs}=await submitArticles(DB,[{...article,mode:'publish'},{...article,mode:'publish'}],options);
  DB.sqlite.prepare("UPDATE posts SET status='archived' WHERE id=?").run(jobs[0].post_id);
  DB.sqlite.prepare('DELETE FROM posts WHERE id=?').run(jobs[1].post_id);
  await publishDueArticles({DB},{now});
  assert.equal((await getPost(DB,jobs[0].post_id)).status,'archived');
  assert.equal((await recentPublications(DB,'123'))[0].status,'cancelled');
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM editorial_jobs').get().n,1);
});
test('batch supports independent publication modes, UTF-8 and same titles',async()=>{
  const DB=database();const {jobs}=await submitArticles(DB,[{...article,mode:'publish'},article,{...article,mode:'schedule',schedule:'2026-09-28 09:00'}],options);
  await publishDueArticles({DB},{now});
  assert.equal(new Set(jobs.map(j=>j.slug)).size,3);
  assert.deepEqual((await recentPublications(DB,'123')).map(x=>x.post_status),['draft','draft','published']);
});
test('unauthorized chat cannot store posts or upload media',async t=>{
  const messages=telegram(t);const DB=database();
  await handleEditorialMessage(env(DB),{text:'/post Title\nContent'},'999');
  assert.match(messages[0].text,/chưa được cấp quyền/);
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,0);
});
test('webhook requires a configured valid secret for editorial commands',async t=>{
  const messages=telegram(t);const DB=database();
  const request=()=>new Request('https://phanthuanxtra.com/api/telegram/webhook',{method:'POST',body:JSON.stringify({message:{chat:{id:123},message_id:1,text:'/post Title\nContent'}})});
  assert.equal((await handleTelegramRouter(request(),env(DB))).status,401);
  assert.equal((await handleTelegramRouter(request(),{...env(DB),TELEGRAM_WEBHOOK_SECRET:undefined})).status,503);
  assert.equal(messages.length,0);
});
test('router handles /post and /blog multiline as authored text and reports actual URLs',async t=>{
  const messages=telegram(t);const DB=database();
  for(const [i,cmd] of ['/post','/blog@phanthuanxtra_auto_bot'].entries()) {
    const message={chat:{id:123},message_id:i+1,text:`${cmd} ${article.title}\n${article.content}`};
    await processTelegramUpdate(env(DB),{message},'123');
    await processTelegramUpdate(env(DB),{message},'123');
  }
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,2);
  assert.equal(messages.every(x=>x.text.includes('ĐÃ XUẤT BẢN')),true);
  assert.match(messages[0].text,/https:\/\/phanthuanxtra.com\/blog\//);
});
test('captioned general photo uses WebP and does not invoke vehicle AI; retry skips upload',async t=>{
  const DB=database();let uploads=0;
  t.mock.method(globalThis,'fetch',async(url,init)=>{
    if(url.includes('generativelanguage.googleapis.com'))return geminiResponse(init);
    if(url.includes('/getFile'))return Response.json({ok:true,result:{file_path:'photos/test.jpg'}});
    if(url.includes('/file/bot'))return new Response(new Uint8Array([1,2,3]));
    return Response.json({ok:true,result:{}});
  });
  const pipeline={transform(){return this;},async output(opts){assert.equal(opts.format,'image/webp');assert.equal(opts.metadata,'none');return {response:()=>new Response('webp')};}};
  const e={...env(DB),GEMINI_API_KEY:crypto.randomUUID(),GEMINI_MODEL:"gemini-test",IMAGES:{async info(){return {width:100,height:100};},input(){return pipeline;}},MEDIA:{async head(){return {customMetadata:{plate_privacy:"gemini-reviewed-v1"}};},async put(key){assert.match(key,/\.webp$/);uploads++;}},AI:{run(){throw Error('AI must not be called');}}};
  const message={chat:{id:123},message_id:1,caption:'/post Năng lượng xanh\nNội dung đã soạn.',photo:[{file_id:'test'}]};
  await processTelegramUpdate(e,{message},'123');await processTelegramUpdate(e,{message},'123');
  assert.equal(uploads,1);assert.match(DB.sqlite.prepare('SELECT cover_image FROM posts').get().cover_image,/^\/media\/blog\/.+\.webp$/);
});
test('batch UTF-8 document is downloaded and all posts saved',async t=>{
  const DB=database();
  t.mock.method(globalThis,'fetch',async(url)=>{
    if(url.includes('/getFile'))return Response.json({ok:true,result:{file_path:'documents/bai.json'}});
    if(url.includes('/file/bot'))return new Response(JSON.stringify([{...article,mode:'publish'},article]));
    return Response.json({ok:true,result:{}});
  });
  await processTelegramUpdate(env(DB),{message:{chat:{id:123},message_id:1,caption:'/batch',document:{file_id:'test',file_name:'bai.json'}}},'123');
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,2);
});
test('oversized batch attachment fails before download and before database writes',async t=>{
  const messages=telegram(t),DB=database();
  await handleEditorialMessage(env(DB),{message_id:1,caption:'/batch',document:{file_id:'test',file_name:'bai.json',file_size:200000}},'123');
  assert.match(messages[0].text,/vượt giới hạn/);
  assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM posts').get().n,0);
});
test('cron transaction failure rolls back publication and pending job retries successfully',async()=>{
  const DB=database();const {jobs}=await submitArticles(DB,[{...article,mode:'publish'}],options);
  DB.sqlite.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON cms_audit_log WHEN NEW.action='publish' BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  await assert.rejects(publishDueArticles({DB},{now}));
  assert.equal((await getPost(DB,jobs[0].post_id)).status,'draft');
  assert.equal((await recentPublications(DB,'123'))[0].status,'pending');
  DB.sqlite.exec('DROP TRIGGER fail_audit');assert.equal((await publishDueArticles({DB},{now})).published,1);
});
