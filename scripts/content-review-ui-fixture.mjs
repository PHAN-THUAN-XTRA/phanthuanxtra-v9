// Local-only synthetic UI harness. No production tokens, model calls or customer data.
import http from 'node:http';
import fs from 'node:fs/promises';
import { ownerReviewFixture } from '../tests/helpers/content-owner-review-fixture.mjs';
import worker from '../src/entry.js';

const f = await ownerReviewFixture();
f.env.CONTENT_RUNNER_LIVE_ENABLED = '0';
f.env.TELEGRAM_AUTO_BOT_TOKEN = crypto.randomUUID();
f.env.TELEGRAM_AUTO_PUBLISH_CHAT_IDS = '6451516147';
async function initData() {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 6451516147 }), query_id: crypto.randomUUID() });
  const hmac = async (bytes, value) => new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(value)));
  const key = await hmac(new TextEncoder().encode('WebAppData'), f.env.TELEGRAM_AUTO_BOT_TOKEN);
  const text = [...p].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => k + '=' + v).join('\n');
  p.set('hash', [...await hmac(key, text)].map(b => b.toString(16).padStart(2, '0')).join('')); return p.toString();
}
const assets = { '/admin-control': ['public/admin-control', 'text/html'], '/admin-control.html': ['public/admin-control.html', 'text/html'],
  '/telegram-mini-app.html': ['public/telegram-mini-app.html', 'text/html'], '/content-review.js': ['public/content-review.js', 'application/javascript'],
  '/content-review.css': ['public/content-review.css', 'text/css'], '/editorial-admin.js': ['public/editorial-admin.js', 'application/javascript'] };
const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://127.0.0.1:8765').pathname;
    if (assets[path]) {
      const [file, type] = assets[path]; let body = await fs.readFile(file, 'utf8');
      if (type === 'text/html') {
        const data = await initData();
        const fixture = '<script>sessionStorage.setItem("ptx_admin_token",' + JSON.stringify(f.admin) + ');window.Telegram={WebApp:{initData:' + JSON.stringify(data) + ',ready(){},expand(){}}};</script>';
        body = body.replace('<head>', '<head>' + fixture).replace(/<script src="https:\/\/telegram\.org[^>]+><\/script>/, '');
      }
      res.writeHead(200, { 'content-type': type + '; charset=utf-8', 'cache-control': 'no-store' }); res.end(body); return;
    }
    const empty = { '/api/admin/dashboard': { stats: {}, ok: true }, '/api/health': { ok: true }, '/api/admin/cars': { cars: [] }, '/api/admin/leads': { leads: [] }, '/api/admin/posts': { posts: [] },
      '/api/telegram/mini/v1/cars': { cars: [] }, '/api/telegram/mini/v1/customers': { customers: [] } };
    if (empty[path]) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(empty[path])); return; }
    const bytes = []; for await (const chunk of req) bytes.push(chunk);
    const response = await worker.fetch(new Request('https://phanthuanxtra.com' + req.url, { method: req.method, headers: req.headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(bytes) }) }), f.env);
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'FIXTURE_UNAVAILABLE' })); }
});
server.listen(8765, '0.0.0.0', () => console.log('Synthetic owner review UI fixture: http://127.0.0.1:8765/telegram-mini-app.html?view=content'));
