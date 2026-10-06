const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function youtubeId(value) {
  try {
    const u = new URL(String(value));
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const host = u.hostname.toLowerCase();
    const id = host === 'youtu.be' ? u.pathname.slice(1) :
      ['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host) ?
        (u.pathname === '/watch' ? u.searchParams.get('v') : u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1]) : null;
    return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}

export function facebookVideoUrl(value) {
  try {
    const u = new URL(String(value).trim());
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const host = u.hostname.toLowerCase();
    if (!['facebook.com','www.facebook.com','m.facebook.com'].includes(host)) return null;
    if (!/^\/(?:share\/r|reel|watch|[^/]+\/videos)(?:\/|$)/.test(u.pathname)) return null;
    return u.href;
  } catch { return null; }
}

const youtubeEmbed = id => `<div class="blog-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video YouTube" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p class="blog-video-link"><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">Xem video đầy đủ trên YouTube ↗</a></p>`;

const facebookEmbed = url => {
  const pluginUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&height=476&show_text=false&width=267&t=0`;
  return `<div class="article-video-facebook blog-video-facebook"><iframe src="${pluginUrl}" width="267" height="476" title="Video Facebook" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
};

export function renderBlogContent(content) {
  const raw = String(content ?? '');
  const legacy = raw.match(/<iframe\b[^>]*\bsrc\s*=\s*["'](https:\/\/[^"']+)["'][^>]*>\s*<\/iframe>/i);
  const legacyId = youtubeId(legacy?.[1] || raw.trim());
  if (legacyId) return youtubeEmbed(legacyId);

  return raw.split('\n').map(line => {
    const trimmed = line.trim();
    const id = youtubeId(trimmed);
    if (id) return youtubeEmbed(id);
    const facebook = facebookVideoUrl(trimmed);
    if (facebook) return facebookEmbed(facebook);
    return esc(line);
  }).join('<br>');
}

export function videoEditorialError(post, existing = {}) {
  const content = String(post.content || '').trim();
  const hasEmbed = /<iframe\b/i.test(content);
  if (hasEmbed && !youtubeId(content.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1])) return 'Video nhúng cần URL YouTube HTTPS hợp lệ.';
  if (hasEmbed && !/<\/iframe>/i.test(content)) return 'Mã nhúng video chưa hoàn chỉnh.';
  if (post.slug !== existing.slug && /(?:^|-)review-xe(?:-|$)/.test(post.slug) && !/(?:^|\W)(?:xe|oto|o-to|ô tô)(?:\W|$)/i.test(post.title))
    return 'Slug review xe không khớp tiêu đề; hãy chọn đường dẫn đúng chủ đề.';
  return null;
}
