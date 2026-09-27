import { renderPostCard } from './blog-cards.js';

const grid = document.querySelector('#latest-posts');
if (grid) {
  fetch('/api/blog/posts?limit=3', {cache:'no-store', credentials:'same-origin'})
    .then(response => { if (!response.ok) throw new Error('Blog unavailable'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data.posts)) throw new Error('Invalid posts response');
      grid.innerHTML = data.posts.slice(0,3).map(post => renderPostCard(post, 'h3')).join('') || '<p class="blog-status">Chưa có bài viết đã xuất bản.</p>';
    })
    .catch(() => { grid.innerHTML = '<p class="blog-status">Chưa tải được bài viết. <a href="/blog">Xem tất cả bài viết →</a></p>'; });
}
