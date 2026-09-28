import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPostCard, postDate } from '../src/blog-cards.js';
import { handleBlog } from '../src/blog.js';

const post = {slug:'giao-nhanh',title:'Giao nhanh về Nhà',category:'Danh gia & Trai nghiem',author:'Phan Thuan',published_at:'2026-09-25T00:00:00Z',cover_image:'/images/car.jpg'};
test('cards preserve Vietnamese, separate metadata, and avoid duplicated image titles', () => {
  const html = renderPostCard(post, 'h3');
  assert.match(html, /<h3>/);
  assert.match(html, /Đánh giá &amp; Trải nghiệm/);
  assert.match(html, /<span>Phan Thuần<\/span><span aria-hidden="true">•<\/span><time/);
  assert.match(html, />25\/9\/2026<\/time>/);
  assert.match(html, /alt="" loading="lazy"/);
});
test('cards escape editorial input and reject active image URLs', () => {
  const html = renderPostCard({...post,title:'<script>alert(1)</script>',cover_image:'javascript:alert(1)',excerpt:'<img onerror=alert(1)>'});
  assert.doesNotMatch(html, /<script>|<img|javascript:/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(postDate('invalid'), '');
  assert.match(postDate('2026-09-24 18:00:00'), />25\/9\/2026<\/time>/);
});
test('blog route renders the same card and filters published posts', async () => {
  const db = {prepare(sql) {assert.match(sql, /status='published'/);return {bind() {return {all:async()=>({results:[post]})}}}}};
  const response = await handleBlog(new Request('https://phanthuanxtra.com/blog'), {DB:db});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/charset=utf-8/);
  const html = await response.text();
  assert.ok(html.includes(renderPostCard({...post,tags:[]})));
});
