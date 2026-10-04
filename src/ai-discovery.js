import { norm, getImages } from './index.js';

const ORIGIN = 'https://phanthuanxtra.com';
const PUBLIC_STATUS = new Set(['available', 'reserved', 'sold']);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const carUrl = id => `${ORIGIN}/car.html?id=${encodeURIComponent(id)}`;
const safeImage = value => {
  try { const u = new URL(value, ORIGIN); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
};
const jsonScript = data => JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const statusText = status => ({available:'Đang bán', reserved:'Đã đặt cọc', sold:'Đã bán'}[status]);

function response(body, type = 'text/html', status = 200, method = 'GET') {
  return new Response(method === 'HEAD' ? null : body, {status, headers:{
    'content-type': `${type}; charset=utf-8`, 'cache-control':'no-store',
    'x-content-type-options':'nosniff', 'referrer-policy':'strict-origin-when-cross-origin',
    ...(status !== 200 ? {'x-robots-tag':'noindex'} : {})
  }});
}

export function vehicleSchema(row, vehicle) {
  const images = [vehicle.cover_image, ...vehicle.images.map(x => typeof x === 'string' ? x : x.url)].map(safeImage).filter(Boolean);
  const result = {'@context':'https://schema.org', '@type':'Car', '@id':carUrl(row.id)+'#vehicle',
    name:`${vehicle.brand} ${vehicle.name}`.trim(), url:carUrl(row.id),
    brand:{'@type':'Brand',name:vehicle.brand}, model:vehicle.name,
    description:vehicle.description, image:[...new Set(images)]};
  if (Number(row.year) > 1900) result.vehicleModelDate = String(row.year);
  // Only emit owner-stored facts. Unknown mileage/price is not zero or a guessed offer.
  if (vehicle.odo !== 'Liên hệ' && row.mileage != null && Number.isFinite(Number(row.mileage)) && Number(row.mileage) >= 0)
    result.mileageFromOdometer = {'@type':'QuantitativeValue',value:Number(row.mileage),unitCode:'KMT'};
  const price = Number(String(vehicle.price).replace(/[^0-9]/g,''));
  if (Number.isFinite(price) && price > 0) result.offers = {'@type':'Offer',url:carUrl(row.id),price,priceCurrency:'VND',
    availability:`https://schema.org/${({available:'InStock',reserved:'OutOfStock',sold:'SoldOut'})[row.status]}`};
  return result;
}

export function vehicleBody(row, c) {
  const name = `${c.brand} ${c.name}`.trim();
  const images = c.images.map(x => typeof x === 'string' ? x : x.url).map(safeImage).filter(Boolean);
  const cover = safeImage(c.cover_image) || images[0];
  return `<div class="detail-grid"><div>${cover ? `<img src="${esc(cover)}" alt="${esc(name)}" style="width:100%;height:auto;border-radius:12px">` : ''}</div><div class="detail-info"><p class="eyebrow">${esc(c.brand)}</p><h1>${esc(name)}</h1><p class="lead">${esc([c.year,c.engine,c.odo].filter(Boolean).join(' • '))}</p><p>${esc(statusText(row.status))}</p><div class="price big">${esc(c.price)}</div><div class="vehicle-description">${esc(c.description)}</div>${c.features.length ? `<h2>Trang bị nổi bật</h2><ul class="options">${c.features.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}<div class="actions"><a class="btn primary" href="tel:+84866997891">Gọi tư vấn</a><a class="btn zalo" href="https://zalo.me/0866997891" rel="noopener noreferrer">Nhắn Zalo</a></div></div></div>${images.length ? `<section class="vehicle-gallery"><h2>Hình ảnh chi tiết (${images.length} ảnh)</h2><div class="vehicle-gallery-grid">${images.map((src,i)=>`<a href="${esc(src)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="${esc(src)}" alt="${esc(name)} — ảnh ${i+1}"></a>`).join('')}</div></section>` : ''}`;
}

export function renderVehicle(template, row, c) {
  const name = `${c.brand} ${c.name}`.trim();
  const head = `<meta name="description" content="${esc(`${name} ${c.year} — ${c.price}. ${statusText(row.status)}. ${c.description}`.slice(0,300))}"><link rel="canonical" href="${esc(carUrl(row.id))}"><meta property="og:title" content="${esc(name)}"><meta property="og:url" content="${esc(carUrl(row.id))}"><script type="application/ld+json">${jsonScript(vehicleSchema(row,c))}</script>`;
  // Render identical content for users and crawlers; no user-agent sniffing or hydration race.
  return template.replace(/<title>[^<]*<\/title>/,`<title>${esc(name)} | PHAN THUẦN XTRA</title>`)
    .replace('</head>',head+'</head>')
    .replace('<div id="vehicleDetail"><p class="notice">Đang tải thông tin xe...</p></div>',`<div id="vehicleDetail">${vehicleBody(row,c)}</div>`)
    .replace(/<script>[\s\S]*?<\/script>/g,'');
}

export async function handleAiDiscovery(request, env) {
  const u = new URL(request.url);
  const detail = ['/car','/car/','/car.html'].includes(u.pathname);
  const catalog = ['/cars','/cars/'].includes(u.pathname);
  if (!detail && !catalog && u.pathname !== '/sitemap.xml') return null;
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  if (!env.DB) return response('Catalogue temporarily unavailable','text/plain',503,request.method);
  const db = env.DB.withSession?.('first-primary') || env.DB;
  try {
    if (detail) {
      const id = u.searchParams.get('id') || '';
      if (!/^[a-z0-9][a-z0-9_-]{2,80}$/i.test(id)) return response('Không tìm thấy xe','text/plain',404,request.method);
      const row = await db.prepare("SELECT * FROM cars WHERE id=? AND status IN ('available','reserved','sold') LIMIT 1").bind(id).first();
      if (!row || !PUBLIC_STATUS.has(row.status)) return response('Không tìm thấy xe','text/plain',404,request.method);
      const c = norm(row,await getImages(db,id));
      const asset = await env.ASSETS.fetch(new Request(`${ORIGIN}/car.html`,{headers:{'accept-encoding':'identity'}}));
      if (!asset.ok) return response('Catalogue temporarily unavailable','text/plain',503,request.method);
      return response(renderVehicle(await asset.text(),row,c),'text/html',200,request.method);
    }
    const cars = (await db.prepare("SELECT id,brand,model,year,price,status FROM cars WHERE status IN ('available','reserved','sold') ORDER BY featured DESC,created_at DESC LIMIT 49001").all()).results || [];
    if (cars.length > 49000) throw Error('Sitemap requires pagination');
    if (catalog) {
      const body = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kho xe — PHAN THUẦN XTRA</title><link rel="canonical" href="${ORIGIN}/cars"><link rel="stylesheet" href="/style.css"></head><body><main class="container"><a href="/">PHAN THUẦN XTRA</a><h1>Kho xe</h1><p>Thông tin từ kho xe hiện tại. Giá và tình trạng có thể thay đổi; liên hệ 0866 997 891 để xác nhận.</p><ul>${cars.map(c=>`<li><a href="${esc(carUrl(c.id))}">${esc(`${c.brand} ${c.model} ${c.year ?? ''}`)}</a> — ${esc(statusText(c.status))} — ${esc(norm(c).price)}</li>`).join('')}</ul></main></body></html>`;
      return response(body,'text/html',200,request.method);
    }
    const posts = (await db.prepare("SELECT slug FROM posts WHERE status='published' ORDER BY id DESC LIMIT 990").all()).results || [];
    if (posts.length >= 990) throw Error('Sitemap requires pagination');
    const asset = await env.ASSETS.fetch(new Request(`${ORIGIN}/sitemap.xml`));
    if (!asset.ok) throw Error('Static sitemap unavailable');
    const base = await asset.text();
    // Keep editorial/static URLs; append only current public records. Never emit invented lastmod.
    const urls = [`${ORIGIN}/cars`, ...cars.filter(c=>PUBLIC_STATUS.has(c.status)).map(c=>carUrl(c.id)), ...posts.map(p=>`${ORIGIN}/blog/${encodeURIComponent(p.slug)}`)];
    const xml = base.replace('</urlset>',urls.map(url=>`  <url><loc>${esc(url)}</loc></url>`).join('\n')+'\n</urlset>');
    return response(xml,'application/xml',200,request.method);
  } catch {
    // Fail closed: a DB outage must not resurrect hidden vehicles from static fallback.
    return response('Catalogue temporarily unavailable','text/plain',503,request.method);
  }
}
