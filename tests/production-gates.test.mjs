import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { canAutoPublish } from '../src/telegram-ingest.js';
import { handleAiChat } from '../src/ai-chat.js';
import { handleAppApi } from '../src/app-api.js';
import { handleMediaApi } from '../src/media.js';
import worker from '../src/index.js';

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


test('production gate: index routes media through privacy-aware handler and shared media policy', () => {
  const src = fs.readFileSync(new URL('../src/index.js', import.meta.url),'utf8');
  assert.match(src,/import \{ handleMediaApi \} from "\.\/media\.js"/);
  assert.match(src,/return handleMediaApi\(r,e\)/);
  assert.match(src,/imageInputLimit\(\)/);
  assert.match(src,/storePublishingImage\(e,bytes\)/);
  assert.match(src,/MEDIA_POLICY\.image\.maxPerArticle/);
  assert.doesNotMatch(src,/12\*1024\*1024/);
  assert.doesNotMatch(src,/slice\(0,30\)/);
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
  assert.equal(data.ai_model, '@cf/nvidia/nemotron-3-120b-a12b');
  assert.deepEqual(calls, ['@cf/zai-org/glm-4.7-flash', '@cf/nvidia/nemotron-3-120b-a12b']);
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
  const canonical = fs.readFileSync(new URL('../public/business-jets.html', import.meta.url), 'utf8');
  assert.equal(page, canonical, 'Worker-served Business Jets asset must match the reviewed public source');
  assert.ok(page.includes('PHAN THUẦN XTRA'));
  assert.ok(page.includes('Chuyên Cơ Thương Gia'));
  assert.ok(page.includes('Embraer Legacy 600'));
  assert.ok(page.includes('PhanThuanSaigon%2Fvideos%2F1351047426633823'));
  assert.match(page, /Yêu cầu phương án chuyến bay/);
  assert.match(page, /Rolls-Royce AE3007A1P/);
  assert.doesNotMatch(page, /an toàn tuyệt đối|15\s*[–-]\s*20 phút|AE 3007A1E/i);
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
  assert.equal((page.match(/<img[^>]+src="\/media\/editorial\/yachts\/yachts-/g) || []).length, 8);
  for (const file of files) {
    assert.ok(page.includes('/media/editorial/yachts/' + file), 'missing yacht image: ' + file);
  }
  assert.match(page, /yachts-02-marina-sunset\.webp[^>]+fetchpriority="high"/);
  assert.equal((page.match(/<img[^>]+loading="lazy"/g) || []).length, 7);
  assert.equal((page.match(/<img[^>]+decoding="async"/g) || []).length, 8);
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


test('production gate: Telegram albums use media_group_id as one stable vehicle bundle', () => {
  const router = fs.readFileSync(new URL('../src/telegram-router.js', import.meta.url), 'utf8');
  assert.match(router, /message\.media_group_id/);
  assert.match(router, /:album:\$\{mediaGroupId\}/);
  assert.match(router, /let bundleKey = mediaGroupId \? `\$\{chatId\}:album:\$\{mediaGroupId\}`/);
  assert.match(router, /pendingPhotoRows=recent\.filter/);
  assert.match(router, /UPDATE telegram_inbox SET bundle_key=\?,updated_at=CURRENT_TIMESTAMP/);
  assert.match(router, /const partner = mediaGroupId \? null : recent\.find/);
  assert.match(router, /LIMIT 50/);
});


test('production gate: both website AI surfaces advertise full-site advisory scope', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(page, /id="ai-assistant"/);
  assert.match(page, /id="aiWidget"/);
  assert.match(page, /tư vấn toàn bộ nội dung chính thức đang có trên website/i);
  assert.match(page, /Green Energy/);
  assert.match(page, /du thuyền/);
  assert.match(page, /chuyên cơ thương gia/);
});


test('production gate: Green Energy editorial page carries PV ESS Hybrid SEO contract', () => {
  const page = fs.readFileSync(new URL('../public/green-energy.html', import.meta.url), 'utf8');
  assert.match(page, /<title>Năng lượng xanh &amp; điện mặt trời \| Phan Thuần Xtra<\/title>/);
  assert.match(page, /Năng Lượng Xanh/);
  assert.match(page, /Năng lượng xanh – Điện mặt trời &amp; giải pháp lưu trữ ESS/);
  assert.match(page, /Energy Storage System/);
  assert.match(page, />Hòa lưới</);
  assert.match(page, />Độc lập</);
  assert.match(page, />Hybrid</);
  assert.match(page, /Đồng bằng sông Cửu Long/);
  assert.match(page, /miền Trung/);
  assert.match(page, /https:\/\/phanthuanxtra\.com\/green-energy/);
});


test('production gate: Green Energy 3D PV ESS visual uses R2 WebP asset', () => {
  const page = fs.readFileSync(new URL('../public/green-energy.html', import.meta.url), 'utf8');
  assert.match(page, /\/media\/editorial\/green-energy\/green-energy-pv-ess-3d\.webp/);
  assert.match(page, /alt="Mô hình 3D hệ thống năng lượng xanh Phan Thuần Xtra gồm điện mặt trời PV, inverter, pin lưu trữ ESS, điện lưới và thiết bị sử dụng"/);
  assert.match(page, /width="1536" height="1024"/);
  assert.match(page, /class="energy-visual"/);
});


test('production gate: homepage Green Energy production delivery gate checks AVIF and WebP responses', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/production-asset-gate.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes('media/editorial/green-energy/green-energy-home-hero.avif'));
  assert.ok(workflow.includes('media/editorial/green-energy/green-energy-home-hero.webp'));
  assert.ok(workflow.includes('check_image()'));
  assert.ok(workflow.includes('test "$status" = "200"'));
  assert.ok(workflow.includes('test -s "$body"'));
  assert.ok(workflow.includes('image/avif'));
  assert.ok(workflow.includes('image/webp'));
  assert.ok(workflow.includes('Green Energy homepage AVIF/WebP delivery PASS'));
  const page = fs.readFileSync(new URL('../public/green-energy.html', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /\\\\n\s+\.energy-visual/);
});


test('production gate: Business Jets uses verified private aviation copy', () => {
  const page = fs.readFileSync(new URL('../public/business-jets.html', import.meta.url), 'utf8');
  assert.match(page, /Chuyên Cơ Thương Gia/);
  assert.match(page, /EMB-135BJ \/ Legacy 600/);
  assert.match(page, /Rolls-Royce AE3007A1P/);
  assert.match(page, /Legacy 600 không phải Praetor 600/);
  assert.match(page, /id="flight-request"/);
  assert.match(page, /Business Jets \/ Private Aviation/);
  assert.doesNotMatch(page, /an toàn tuyệt đối/i);
  assert.doesNotMatch(page, /15\s*[–-]\s*20 phút/i);
  assert.doesNotMatch(page, /AE 3007A1E/);
  assert.equal((page.match(/facebook\.com\/plugins\/video\.php/g) || []).length, 1);
});


test('production gate: Business Jets lead preserves itinerary for Telegram CRM', () => {
  const script = fs.readFileSync(new URL('../public/script.js', import.meta.url), 'utf8');
  const worker = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  assert.match(script, /f\.get\("origin"\)/);
  assert.match(script, /f\.get\("destination"\)/);
  assert.match(script, /f\.get\("flight_date"\)/);
  assert.match(script, /f\.get\("passengers"\)/);
  assert.match(script, /"business-jets"/);
  assert.match(script, /source,message/);
  assert.match(worker, /source=text\(b\.source\|\|"website-lead",60\)/);\n  assert.match(worker, /notifyTelegramCrm\(e,\{source,name:b\.name,phone:p,car:b\.car_id,message:b\.message\}\)/);
  assert.doesNotMatch(worker, /source:'test-drive',name:b\.name,phone:p/);
});

test('Business Jets lead stores itinerary in D1 and Telegram accepts correctly classified message', async () => {
  const rows=[];
  const DB={prepare(sql){return {bind(...args){return {
    async run(){if(sql.includes('INSERT INTO leads')){rows.push({id:17,name:args[0],phone:args[1],message:args[3]});return {meta:{last_row_id:17}};}return {meta:{changes:1}};},
    async all(){return {results:rows};}
  };}};}};
  const originalFetch=globalThis.fetch;
  let telegramText='';
  globalThis.fetch=async (_url,options)=>{
    telegramText=JSON.parse(options.body).text;
    return Response.json({ok:true,result:{message_id:321,chat:{id:-123}}});
  };
  try{
    const message='Business Jets / Private Aviation | Điểm đi: TP.HCM | Điểm đến: Đà Nẵng | Ngày/giờ: 2026-10-02 09:00 | Số khách: 4 | Hành lý: 2 kiện';
    const response=await worker.fetch(new Request('https://phanthuanxtra.com/api/leads',{
      method:'POST',headers:{'content-type':'application/json',authorization:'Bearer test'},
      body:JSON.stringify({source:'business-jets',name:'Kiểm thử Business Jets',phone:'0900000000',message})
    }),{DB,ADMIN_TOKEN:'test',TELEGRAM_CRM_BOT_TOKEN:'bot',TELEGRAM_CRM_CHAT_ID:'-123'});
    const data=await response.json();
    assert.equal(data.stored,true);
    assert.equal(data.lead_id,17);
    assert.equal(data.delivery.sent,true);
    assert.equal(data.delivery.messageId,321);
    assert.equal(rows[0].message,message);
    for(const marker of ['SOURCE: BUSINESS JETS','Kiểm thử Business Jets','0900000000','TP.HCM','Đà Nẵng','2026-10-02 09:00','Số khách: 4','Hành lý: 2 kiện'])assert.match(telegramText,new RegExp(marker));
    assert.doesNotMatch(telegramText,/SOURCE: WEBSITE AI CHAT/);
  }finally{globalThis.fetch=originalFetch;}
});


test('production gate: Telegram albums store dual formats and require explicit human approval', () => {
  const router = fs.readFileSync(new URL('../src/telegram-router.js', import.meta.url), 'utf8');
  const ingest = fs.readFileSync(new URL('../src/telegram-ingest.js', import.meta.url), 'utf8');
  assert.match(router, /const photoRows = rows\.filter\(row => row\.file_id\)/);
  assert.match(router, /storeTelegramVehicleVariants/);
  assert.match(router, /publish_media_keys: publishMediaKeys/);
  assert.match(router, /avif_media_keys: avifMediaKeys/);
  assert.match(router, /image_processing: "format-only"/);
  assert.match(router, /approval_required: true/);
  assert.match(router, /status='awaiting_review'/);
  assert.match(router, /promoteDraft\(env,Number\(inboxId\),ai,keys\[0\],keys,true\)/);
  assert.match(ingest, /images:imageUrls\.length\?imageUrls:\[imageUrl\]/);
});


test('production gate: failed Telegram albums clean already-persisted verified media', () => {
  const router = fs.readFileSync(new URL('../src/telegram-router.js', import.meta.url), 'utf8');
  assert.match(router, /const processed = \[\];\s*try \{/);
  assert.match(router, /for \(const item of processed\)/);
  assert.match(router, /env\.MEDIA\?\.delete\(key\)/);
  assert.match(router, /DELETE FROM media_assets WHERE r2_key=\?/);
  assert.match(router, /UPDATE telegram_inbox SET status='failed',bundle_status='failed'/);
});


test('production gate: Android application rejects cleartext traffic', () => {
  const manifest = fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
});


test('production gate: sitemap covers all canonical public verticals', () => {
  const sitemap = fs.readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  for (const route of ['/', '/phan-thuan', '/green-energy', '/yachts', '/business-jets', '/blog']) {
    assert.ok(sitemap.includes('<loc>https://phanthuanxtra.com' + route + '</loc>'), 'missing sitemap route: ' + route);
  }
});

test('production gate: editorial pages expose mobile nav and complete social metadata', () => {
  for (const file of ['phan-thuan.html','green-energy.html','yachts.html','business-jets.html']) {
    const page = fs.readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
    assert.match(page, /class="menu-toggle"/, file + ' missing mobile menu');
    assert.match(page, /property="og:image"/, file + ' missing og:image');
    assert.match(page, /name="twitter:image"/, file + ' missing twitter:image');
    assert.match(page, /application\/ld\+json/, file + ' missing structured data');
  }
});

test('production gate: Business Jets CRM E2E runs after every successful main production deploy', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/business-jets-crm-production-e2e.yml', import.meta.url), 'utf8');
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.doesNotMatch(workflow, /contains\(github\.event\.workflow_run\.display_title, 'business-jets'\)/);
});


test('performance gate: homepage hero reserves layout and lazy-loads non-LCP slides', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const autoStart = page.indexOf('id="hero-slide-auto"');
  const autoEnd = page.indexOf('</article>', autoStart);
  const autoSlide = page.slice(autoStart, autoEnd);
  assert.match(autoSlide, /fetchpriority="high"/);
  assert.match(autoSlide, /width="1280" height="853"/);
  for (const id of ['hero-slide-yacht','hero-slide-jet']) {
    const start = page.indexOf('id="' + id + '"');
    const end = page.indexOf('</article>', start);
    const slide = page.slice(start, end);
    assert.match(slide, /loading="lazy"/, id + ' must lazy-load');
    assert.match(slide, /width="1280" height="853"/, id + ' must reserve image geometry');
  }
  const energyStart = page.indexOf('id="hero-slide-energy"');
  const energyEnd = page.indexOf('</article>', energyStart);
  const energySlide = page.slice(energyStart, energyEnd);
  assert.match(energySlide, /loading="lazy"/, 'hero-slide-energy must lazy-load');
  assert.match(energySlide, /width="1672" height="940"/, 'hero-slide-energy must reserve intrinsic image geometry');
});

test('production gate: business jet homepage hero uses verified owned R2 media', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const start = page.indexOf('id="hero-slide-jet"');
  const end = page.indexOf('</article>', start);
  const slide = page.slice(start, end);
  assert.match(slide, /data-src="\/media\/editorial\/business-jets\/hero-business-jet-phan-thuan-2026\.webp"/);
  assert.match(slide, /href="\/business-jets#flight-request"/);
  assert.doesNotMatch(slide, /Ronnie Macdonald|creativecommons\.org|commons\.wikimedia\.org/);
});

test('performance gate: stable CSS and JS URLs revalidate instead of caching immutable for a year', () => {
  const headers = fs.readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  for (const asset of ['/style.css','/script.js','/hero-carousel.js','/blog-latest.js']) {
    const start = headers.indexOf(asset);
    assert.ok(start >= 0, 'missing cache policy for ' + asset);
    const policy = headers.slice(start, start + 140);
    assert.match(policy, /max-age=300, stale-while-revalidate=86400/);
    assert.doesNotMatch(policy, /immutable/);
  }
});


test('performance gate: Green Energy homepage hero uses verified internal R2 artwork', () => {
  const page = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const start = page.indexOf('id="hero-slide-energy"');
  const end = page.indexOf('</article>', start);
  const slide = page.slice(start, end);
  assert.ok(slide.includes('data-srcset="/media/editorial/green-energy/green-energy-home-hero.avif"'));
  assert.ok(slide.includes('data-srcset="/media/editorial/green-energy/green-energy-home-hero.webp"'));
  assert.ok(slide.includes('data-src="/media/editorial/green-energy/green-energy-home-hero.webp"'));
  assert.ok(slide.includes('<picture>'));
  assert.doesNotMatch(slide, /wikimedia\.org/);
});


test('production gate: Defender tg-605 reconciles owner copy and semantic gallery without R2 mutation',()=>{
  const source=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  assert.match(source,/TG605_MEDIA_ORDER=\['telegram-625-f38722c5c54d18ec\.webp'/);
  const order=(source.match(/const TG605_MEDIA_ORDER=\[([^\n]+)\];/)?.[1].match(/'[^']+'/g)||[]);
  assert.equal(order.length,16);
  assert.equal(new Set(order).size,16);
  assert.match(source,/function reconcileTg605\(c,images\)/);
  assert.match(source,/if\(c\.id!=='tg-605'\)return\{c,images\}/);
  assert.match(source,/description\.slice\(0,end\+marker\.length\)/);
  assert.match(source,/price:4879000000,mileage:null/);
  assert.match(source,/is_cover:i===0\?1:0/);
  assert.doesNotMatch(source.slice(source.indexOf('function reconcileTg605'),source.indexOf('function norm')),/put\(|delete\(|R2|IMAGES/);
});
