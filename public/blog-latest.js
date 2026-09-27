import { displayText } from './blog-cards.js';

const grid = document.querySelector('#latest-posts');
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function card(post) {
  const article = element('article', 'blog-card');
  const href = '/blog/' + encodeURIComponent(post.slug);
  const cover = String(post.cover_image || '');
  if (/^https?:\/\//i.test(cover) || /^\/(?!\/)/.test(cover)) {
    const link = element('a', 'blog-card-media');
    link.href = href;
    link.setAttribute('aria-label', String(post.title || ''));
    const image = element('img');
    image.src = cover; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
    link.append(image); article.append(link);
  }
  const body = element('div', 'blog-card-body');
  body.append(element('p', 'eyebrow', displayText(post.category || 'Tin tức')));
  const heading = element('h3');
  const link = element('a', '', String(post.title || ''));
  link.href = href; heading.append(link); body.append(heading);
  if (post.excerpt) body.append(element('p', 'blog-card-excerpt', String(post.excerpt)));
  const meta = element('p', 'blog-card-meta');
  meta.append(element('span', '', displayText(post.author || 'Phan Thuần')));
  const raw = String(post.published_at || post.created_at || '');
  const date = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw);
  if (!Number.isNaN(date.getTime())) {
    const separator = element('span', '', '•'); separator.setAttribute('aria-hidden', 'true');
    const time = element('time', '', date.toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}));
    time.dateTime = date.toISOString(); meta.append(separator, time);
  }
  body.append(meta); article.append(body); return article;
}
if (grid) {
  fetch('/api/blog/posts?limit=3', {cache:'no-store', credentials:'same-origin'})
    .then(response => { if (!response.ok) throw new Error('Blog unavailable'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data.posts)) throw new Error('Invalid posts response');
      const cards = data.posts.slice(0,3).map(card);
      grid.replaceChildren(...(cards.length ? cards : [element('p', 'blog-status', 'Chưa có bài viết đã xuất bản.')]));
    })
    .catch(() => {
      const status = element('p', 'blog-status', 'Chưa tải được bài viết. ');
      const link = element('a', '', 'Xem tất cả bài viết →'); link.href = '/blog';
      status.append(link); grid.replaceChildren(status);
    });
}
