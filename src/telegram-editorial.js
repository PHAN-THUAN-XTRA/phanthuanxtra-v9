import { requirePrivateCover } from './gemini-plate-privacy.js';
import { storePublishingImage } from './publishing-api.js';
import { imageInputLimit } from './media-policy.js';
import { canPublishAutoBlog, parseAutoCommand } from './auto-bot-ai.js';
import { parseArticle, parseBatch, submitArticles, publishDueArticles, changePublication, recentPublications, localTime, publicationResults, publicationKey, getPublication } from './editorial-publishing.js';

export const EDITORIAL_HELP = '\n/post <tiêu đề>\\n<nội dung> — đăng bài tổng quát, có thể kèm 1 ảnh cover\n/draft <tiêu đề>\\n<nội dung> — lưu nháp\n/schedule YYYY-MM-DD HH:mm\\n<tiêu đề>\\n<nội dung> — hẹn giờ Việt Nam\n/batch — nhiều bài, ngăn bằng dòng ---; hoặc đính kèm .txt/.json\n/posts — 20 bài gần nhất và trạng thái\n/publish <mã> — đăng bản nháp\n/cancel <mã> — hủy lịch/bản nháp (không gỡ bài đã đăng)\nLịch được xử lý mỗi 5 phút; /post giữ nguyên nội dung, không cần AI.';
const NAMES = new Set(['post','draft','schedule','batch','posts','publish','cancel']);
export function isEditorialMessage(message) {
  const command = parseAutoCommand(message?.caption || message?.text);
  return !!command && (NAMES.has(command.name) || (['blog','news'].includes(command.name) && command.body.includes('\n')));
}
async function call(env, method, payload) {
  const token = env.TELEGRAM_AUTO_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Bot chưa được cấu hình.');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error('Telegram chưa xử lý được yêu cầu.');
  return data.result;
}
async function reply(env, chatId, text) {
  // Stay below Telegram message limits, including long Vietnamese titles and batch reports.
  for (let rest = text; rest;) {
    let end = Math.min(3500, rest.length);
    if (end < rest.length) { const line = rest.lastIndexOf('\n', end); if (line > 0) end = line; }
    await call(env, 'sendMessage', { chat_id: chatId, text: rest.slice(0,end), disable_web_page_preview: true });
    rest = rest.slice(end).replace(/^\n/, '');
  }
}
async function download(env, file, max) {
  if (Number(file.file_size || 0) > max) throw new Error('Tệp vượt giới hạn dung lượng.');
  const result = await call(env, 'getFile', { file_id: file.file_id });
  if (!/^[A-Za-z0-9_./-]+$/.test(result?.file_path || '') || result.file_path.includes('..')) throw new Error('Không tải được tệp Telegram.');
  const token = env.TELEGRAM_AUTO_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${result.file_path}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error('Không tải được tệp Telegram.');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  let complete = false;
  for (let chunkCount = 0; chunkCount < 2048; chunkCount++) {
    const { done, value } = await reader.read(); if (done) { complete = true; break; }
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new Error('Tệp vượt giới hạn dung lượng.'); }
    chunks.push(value);
  }
  if (!complete) { await reader.cancel(); throw new Error('Tệp có quá nhiều phần dữ liệu.'); }
  if (!size) throw new Error('Tệp rỗng.');
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  return bytes;
}
async function cover(env, photo) {
  if (!env.MEDIA || !env.IMAGES) throw new Error('Chưa cấu hình xử lý/lưu ảnh; bài chưa được đăng.');
  const bytes = await download(env,photo,imageInputLimit());
  const media = await storePublishingImage(env,bytes);
  return media.url;
}
function report(job) {
  const states = { draft: 'BẢN NHÁP', pending: 'ĐÃ HẸN', published: 'ĐÃ XUẤT BẢN', cancelled: 'ĐÃ HỦY' };
  const state = job.post_status === 'published' ? 'published' : job.status === 'published' ? 'cancelled' : job.status;
  return `#${job.id} — ${states[state]}: ${job.title}${state === 'pending' ? `\n${localTime(job.scheduled_at)} (giờ Việt Nam)` : ''}${state === 'published' ? `\nhttps://phanthuanxtra.com/blog/${job.slug}` : ''}`;
}
export async function handleEditorialMessage(env, message, chatId) {
  if (!isEditorialMessage(message)) return false;
  if (!canPublishAutoBlog(env,chatId)) {
    await reply(env,chatId,'Chat này chưa được cấp quyền đăng Blog.'); return true;
  }
  if (!env.DB) { await reply(env,chatId,'Chưa kết nối cơ sở dữ liệu bài viết.'); return true; }
  const command = parseAutoCommand(message.caption || message.text);
  try {
    if (command.name === 'posts') {
      const jobs = await recentPublications(env.DB,chatId);
      await reply(env,chatId,jobs.length ? jobs.map(report).join('\n\n') : 'Chưa có bài gửi qua luồng đăng bài tổng quát.'); return true;
    }
    if (['publish','cancel'].includes(command.name)) {
      let job = await changePublication(env.DB,chatId,command.body,command.name);
      if (!job) throw new Error('Không tìm thấy bài trong chat này.');
      if (command.name === 'publish') {
        await publishDueArticles(env,{ chatId, requestKey: job.request_key.split(':')[0] });
        job = await getPublication(env.DB,chatId,job.id);
      }
      await reply(env,chatId,report(job)); return true;
    }
    const requestKey = await publicationKey(`${chatId}:${message.message_id}`);
    const existing = await publicationResults(env.DB,chatId,requestKey);
    if (existing.length) { await publishDueArticles(env,{chatId,requestKey}); await reply(env,chatId,(await publicationResults(env.DB,chatId,requestKey)).map(report).join('\n\n')); return true; }
    let items;
    if (command.name === 'batch') {
      let body = command.body;
      if (message.document) {
        if (!/\.(txt|json)$/i.test(message.document.file_name || '')) throw new Error('Gửi tệp UTF-8 .txt hoặc .json, tối đa 100 KiB.');
        body = new TextDecoder('utf-8',{ fatal: true }).decode(await download(env,message.document,100*1024));
      }
      items = parseBatch(body);
      if (message.photo?.length) throw new Error('/batch dùng cover_image riêng cho từng bài trong JSON; gửi từng /post để kèm ảnh.');
    } else {
      if (message.media_group_id) throw new Error('Gửi một ảnh cover riêng kèm /post; album nhiều ảnh chưa được hỗ trợ cho bài tổng quát.');
      items = [parseArticle(command.body, command.name === 'schedule' ? 'schedule' : command.name === 'draft' ? 'draft' : 'publish')];
      if (message.photo?.length) items[0].cover_image = await cover(env,message.photo.at(-1));
    }
    for(const item of items)await requirePrivateCover(env,item.cover_image);
    const result = await submitArticles(env.DB,items,{chatId,messageId:message.message_id});
    await publishDueArticles(env,{chatId,requestKey:result.requestKey});
    await reply(env,chatId,(await publicationResults(env.DB,chatId,result.requestKey)).map(report).join('\n\n'));
  } catch (error) {
    console.error('telegram_editorial_failed',error?.name || 'Error');
    // Never claim that nothing was saved: the database may have committed before a reply failed.
    await reply(env,chatId,`Chưa hoàn tất yêu cầu: ${String(error.message || 'Lỗi xử lý').slice(0,500)}\nGõ /posts để kiểm tra; Telegram gửi lặp cùng mã tin nhắn sẽ không tạo thêm bài.`);
  }
  return true;
}
