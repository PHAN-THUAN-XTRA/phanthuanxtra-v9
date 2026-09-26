import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { canAutoPublish } from '../src/telegram-ingest.js';
import { handleAiChat } from '../src/ai-chat.js';
import { handleAppApi } from '../src/app-api.js';
import { handleMediaApi } from '../src/media.js';

function mockDb(cars = []) {
  const rows = [];
  const unknown = [];
  return {
    prepare(sql) {
      return { bind(...args) {
        return {
          async run() {
            if (sql.includes('INSERT INTO ai_conversations')) rows.push({ type:'conversation', id:args[0] });
            if (sql.includes('INSERT INTO ai_messages')) rows.push({ type:'message', role:args[1], content:args[2] });
            if (sql.includes('INSERT INTO ai_unknown_questions')) unknown.push({ id:unknown.length+1, conversation_id:args[0], question:args[1], name:args[2], phone:args[3], status:'pending' });
          },
          async all() {
            if (sql.includes('FROM ai_messages')) return { results: rows.filter(x=>x.type==='message').slice(-12).map(x=>({role:x.role,content:x.content})) };
            if (sql.includes("FROM cars WHERE status <> 'hidden'")) return { results: cars.filter(x=>x.status !== 'hidden') };
            return { results:[] };
          },
          async first() {
            if (sql.includes('FROM ai_unknown_questions')) return unknown.at(-1) || null;
            return null;
          }
        };
      }};
    },
    _rows: rows,
    _unknown: unknown
  };
}

const plate = { x:0.42, y:0.58, width:0.16, height:0.06 };

test('production gate: Telegram auto-publish requires identity + confidence >= 0.85, not PT Xtra plate detection', () => {
  assert.equal(canAutoPublish({ brand:'Lexus', model:'LX 600', confidence:0.85, plate_bbox:plate }), true);
  assert.equal(canAutoPublish({ brand:'Lexus', model:'LX 600', confidence:0.85, plate_bbox:null }), true);
  assert.equal(canAutoPublish({ brand:'Lexus', model:'LX 600', confidence:0.85 }), true);
  assert.equal(canAutoPublish({ brand:'Lexus', model:'LX 600', confidence:0.849, plate_bbox:plate }), false);
  assert.equal(canAutoPublish({ brand:'Lexus', model:null, confidence:0.99, plate_bbox:plate }), false);
  assert.equal(canAutoPublish({ brand:null, model:'LX 600', confidence:0.99, plate_bbox:plate }), false);
});

test('production gate: unknown AI Chat is handed to a human and AI is not called', async () => {
  const DB = mockDb();
  let aiCalled = false;
  const env = {
    DB,
    AI_SEARCH: { async search() { return { chunks:[] }; } },
    AI: { async run() { aiCalled = true; throw new Error('AI must not answer unknown production-gate question'); } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({ conversation_id:'production-unknown-gate', visitor_id:'production-unknown-gate', message:'Chính sách pháp lý ngoài dữ liệu PHAN THUẦN XTRA là gì?' })
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.needs_human, true);
  assert.equal(aiCalled, false);
  assert.equal(DB._unknown.length, 1);
  assert.match(data.reply, /thông tin xác thực/);
});

test('production gate: malformed car ID is rejected with 400, not an uncaught Worker 500', async () => {
  const response = await handleAppApi(new Request('https://phanthuanxtra.com/api/app/v1/cars/%E0%A4%A', {
    headers:{authorization:'Bearer production-test-token'}
  }), { APP_API_TOKEN:'production-test-token', DB:mockDb() });
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.error, 'ID xe không hợp lệ');
});

test('production gate: malformed media key is rejected with 400, not an uncaught Worker 500', async () => {
  let getCalled = false;
  const response = await handleMediaApi(new Request('https://phanthuanxtra.com/media/%E0%A4%A'), {
    MEDIA: { async get() { getCalled = true; return null; } }
  });
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.error, 'Invalid media key');
  assert.equal(getCalled, false);
});


test('production gate: hidden vehicles are excluded from public catalog query', async () => {
  const src = fs.readFileSync(new URL('../src/index.js', import.meta.url),'utf8');
  assert.match(src,/SELECT \* FROM cars WHERE status <> 'hidden'/);
});


test('production gate: Workers AI falls back when primary returns empty output', async () => {
  const DB = mockDb([{id:'lexus-live',brand:'Lexus',model:'LX 600',year:2025,mileage:100,status:'available',price:1,category:'suv'}]);
  const calls = [];
  const env = {
    DB,
    AI_SEARCH: { async search() { throw new Error('vehicle advice must not use AI Search'); } },
    AI: {
      async run(model) {
        calls.push(model);
        return model === '@cf/zai-org/glm-4.7-flash' ? { response:'' } : { response:'FALLBACK_OK' };
      }
    }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({ conversation_id:'production-ai-fallback', visitor_id:'production-ai-fallback', message:'Lexus LX 600 giá bao nhiêu?' })
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.reply, 'FALLBACK_OK');
  assert.equal(data.ai_model, '@cf/qwen/qwen3.8-27b');
  assert.deepEqual(calls, ['@cf/zai-org/glm-4.7-flash', '@cf/qwen/qwen3.8-27b']);
});


test('production gate: editorial yachts UTF-8 marker matches the current yachts page', () => {
  const gate = fs.readFileSync(new URL('../scripts/verify-editorial-production.mjs', import.meta.url), 'utf8');
  const page = fs.readFileSync(new URL('../public/yachts.html', import.meta.url), 'utf8');
  const marker = 'Du Thuyền Cao Cấp & Hạng Sang';
  assert.match(gate, /\["\/yachts","Du Thuyền Cao Cấp & Hạng Sang"\]/);
  assert.ok(page.includes(marker));
  assert.ok(page.includes('PHAN THUẦN XTRA'));
});


test('production gate: deploy purge includes every Worker-served editorial route', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8');
  for (const route of ['phan-thuan','green-energy','yachts','business-jets']) {
    assert.ok(workflow.includes(`https://phanthuanxtra.com/${route}`), `missing editorial purge URL: ${route}`);
  }
});


test('production gate: business-jets uses an internal Worker asset path distinct from the public route', () => {
  const entry = fs.readFileSync(new URL('../src/entry.js', import.meta.url), 'utf8');
  assert.match(entry, /\["\/business-jets", "\/__ptx_editorial__\/business-jets\.html"\]/);
  assert.match(entry, /headers\.set\("x-ptx-editorial-utf8", "worker-v3"\)/);
});


test('production gate: deploy controller enforces custom-domain Worker route', () => {
  const src = fs.readFileSync(new URL('../scripts/deploy-cloudflare-api.mjs', import.meta.url), 'utf8');
  assert.match(src, /\/workers\/routes/);
  assert.match(src, /phanthuanxtra\.com\/\*/);
  assert.match(src, /script: WORKER/);
  assert.match(src, /ensureCustomDomainRoute\(\)/);
});


test('production gate: business-jets preserves restored Legacy 600 article and Facebook video', () => {
  const page = fs.readFileSync(new URL('../public/__ptx_editorial__/business-jets.html', import.meta.url), 'utf8');
  assert.ok(page.includes('PHAN THUẦN XTRA'));
  assert.ok(page.includes('Chuyên Cơ Thương Gia'));
  assert.ok(page.includes('Embraer Legacy 600'));
  assert.ok(page.includes('PhanThuanSaigon%2Fvideos%2F1351047426633823'));
});


test('production gate: yachts editorial page preserves all eight verified R2 WebP images', () => {
  const page = fs.readFileSync(new URL('../public/yachts.html', import.meta.url), 'utf8');
  const files = [
    'yachts-01-elite-car-yacht-hai-phong.webp',
    'yachts-02-marina-sunset.webp',
    'yachts-03-yacht-experience.webp',
    'yachts-04-yacht-bedroom.webp',
    'yachts-05-phu-quoc-coast.webp',
    'yachts-06-phu-quoc-harbor.webp',
    'yachts-07-phu-quoc-yachts.webp',
    'yachts-08-phu-quoc-sailing.webp',
  ];
  assert.ok(page.includes('Du Thuyền Cao Cấp &amp; Hạng Sang'));
  assert.equal((page.match(/\/media\/editorial\/yachts\/yachts-/g) || []).length, 8);
  for (const file of files) {
    assert.ok(page.includes('/media/editorial/yachts/' + file), 'missing yacht image: ' + file);
  }
  assert.match(page, /yachts-02-marina-sunset\.webp[^>]+fetchpriority="high"/);
  assert.equal((page.match(/loading="lazy"/g) || []).length, 7);
  assert.equal((page.match(/decoding="async"/g) || []).length, 8);
  assert.equal((page.match(/<img[^>]+alt="[^"]+"[^>]*>/g) || []).length, 8);
});


test('production gate: Auto Bot owns the production Telegram webhook and its token is deployed', () => {
  const entry = fs.readFileSync(new URL('../src/entry.js', import.meta.url), 'utf8');
  const router = fs.readFileSync(new URL('../src/telegram-router.js', import.meta.url), 'utf8');
  const deploy = fs.readFileSync(new URL('../scripts/deploy-cloudflare-api.mjs', import.meta.url), 'utf8');
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8');
  assert.match(router, /TELEGRAM_AUTO_BOT_TOKEN \|\| env\.TELEGRAM_BOT_TOKEN/);
  assert.match(router, /getAutoTelegramWebhookStatus/);
  assert.match(router, /setAutoTelegramWebhook/);
  assert.match(entry, /getAutoTelegramWebhookStatus\(env,TELEGRAM_WEBHOOK_URL\)/);
  assert.match(entry, /setAutoTelegramWebhook\(env,TELEGRAM_WEBHOOK_URL\)/);
  assert.match(deploy, /"TELEGRAM_AUTO_BOT_TOKEN"/);
  assert.match(workflow, /TELEGRAM_AUTO_BOT_TOKEN: \$\{\{ secrets\.TELEGRAM_AUTO_BOT_TOKEN \}\}/);
});
