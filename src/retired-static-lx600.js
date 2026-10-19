// Retire a legacy, non-existent static vehicle URL at the edge.
// D1-backed /car.html?id=... listings must stay independent of this tombstone.
export function handleRetiredStaticLx600(request) {
  const pathname = new URL(request.url).pathname;
  if (!/^\/car-lx600(?:\.html|\/)?$/i.test(pathname)) return null;
  const headers = {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
  };
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { ...headers, allow: 'GET, HEAD' } });
  }
  return new Response(request.method === 'HEAD' ? null : 'Trang xe tĩnh Lexus LX600 đã được gỡ vĩnh viễn.', {
    status: 410,
    headers,
  });
}
