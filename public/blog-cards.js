const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const displayText = value => String(value ?? '').replace(/Danh gia & Trai nghiem/gi, 'Đánh giá & Trải nghiệm').replace(/Phan Thuan/gi, 'Phan Thuần');
export function postDate(value) {
  if (!value) return '';
  const raw = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw);
  if (Number.isNaN(date.getTime())) return '';
  return `<time datetime="${date.toISOString()}">${date.toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'})}</time>`;
}
export function renderPostCard(post, heading = 'h2') {
  const tag = heading === 'h3' ? 'h3' : 'h2';
  const href = '/blog/' + encodeURIComponent(post.slug);
  const cover = String(post.cover_image || '');
  const safeCover = /^https?:\/\//i.test(cover) || /^\/(?!\/)/.test(cover);
  const date = postDate(post.published_at || post.created_at);
  return `<article class="blog-card">${safeCover ? `<a class="blog-card-media" href="${esc(href)}" aria-label="${esc(post.title)}"><img src="${esc(cover)}" alt="" loading="lazy" decoding="async"></a>` : ''}<div class="blog-card-body"><p class="eyebrow">${esc(displayText(post.category || 'Tin tức'))}</p><${tag}><a href="${esc(href)}">${esc(post.title)}</a></${tag}>${post.excerpt ? `<p class="blog-card-excerpt">${esc(post.excerpt)}</p>` : ''}<p class="blog-card-meta"><span>${esc(displayText(post.author || 'Phan Thuần'))}</span>${date ? `<span aria-hidden="true">•</span>${date}` : ''}</p></div></article>`;
}
