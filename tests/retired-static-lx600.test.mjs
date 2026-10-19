import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { handleRetiredStaticLx600 } from '../src/retired-static-lx600.js';

const origin = 'https://phanthuanxtra.com';

test('retired static LX600 returns permanent 410 with crawler noindex', async () => {
  for (const path of ['/car-lx600.html', '/car-lx600', '/car-lx600/', '/CAR-LX600.HTML']) {
    const response = handleRetiredStaticLx600(new Request(origin + path + '?utm_source=search'));
    assert.ok(response instanceof Response);
    assert.equal(response.status, 410);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.match(await response.text(), /đã được gỡ vĩnh viễn/);
  }
});

test('retired static LX600 HEAD is 410 with empty body, mutations are refused', async () => {
  const response = handleRetiredStaticLx600(new Request(origin + '/car-lx600.html', { method: 'HEAD' }));
  assert.equal(response.status, 410);
  assert.equal(await response.text(), '');
  const post = handleRetiredStaticLx600(new Request(origin + '/car-lx600.html', { method: 'POST' }));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

test('the retired URL does not interfere with D1-backed detail and public catalog', () => {
  for (const path of ['/car.html?id=tg-lexus-lx600', '/car?id=tg-lx600', '/cars', '/sitemap.xml', '/car-gx460.html']) {
    assert.equal(handleRetiredStaticLx600(new Request(origin + path)), null, path);
  }
});

test('legacy URL is absent from public assets and sitemap; route runs before fallback', () => {
  assert.equal(existsSync('public/car-lx600.html'), false);
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  const homepage = readFileSync('public/index.html', 'utf8');
  assert.doesNotMatch(sitemap, /car-lx600/i);
  assert.doesNotMatch(homepage, /href=["'][^"']*car-lx600/i);
  const entry = readFileSync('src/entry.js', 'utf8');
  assert.match(entry, /import \{ handleRetiredStaticLx600 \} from "\.\/retired-static-lx600\.js";/);
  assert.ok(entry.indexOf('const retiredVehicleResponse = handleRetiredStaticLx600(request);') < entry.indexOf('const discoveryResponse = await handleAiDiscovery(request, env);'));
  const deployment = readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8');
  assert.match(deployment, /Verify retired LX600 URL is gone from production and sitemap/);
  assert.match(deployment, /test \"\$status\" = \"410\"/);
  assert.match(deployment, /car-lx600\\.html/);
});
