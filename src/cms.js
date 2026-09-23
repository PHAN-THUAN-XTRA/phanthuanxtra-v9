import { saveCar, carImages, validCarId } from "./vehicle-persistence.js";
import { listPosts, getPost, savePost, deletePost } from "./post-persistence.js";
const MAX_BODY_BYTES = 1024 * 1024;
const CAR_STATUSES = new Set(["available", "reserved", "sold", "hidden"]);
const LEAD_STATUSES = new Set(["new", "contacted", "qualified", "won", "lost"]);

const SEC = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store"
};

const response = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...SEC, ...headers }
});

const text = (value, max = 1000) => String(value ?? "").trim().slice(0, max);
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bool = value => value === true || value === 1 || value === "1" || value === "true";
const safeId = validCarId;

function authorized(request, env) {
  const key = env.CMS_API_KEY;
  if (!key) return false;
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") && auth.slice(7) === key;
}

async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("Request body quá lớn.");
  return request.json().catch(() => null);
}

async function initCmsDb(db) {}

async function audit(db, action, resource, resourceId, summary) {
  await db.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES (?,?,?,?,?)")
    .bind("chatgpt-cms", action, resource, text(resourceId, 100), text(summary, 500)).run();
}

const imagesFor = carImages;

async function listCars(db, url) {
  const limit = Math.min(Math.max(integer(url.searchParams.get("limit"), 50), 1), 200);
  const offset = Math.max(integer(url.searchParams.get("offset"), 0), 0);
  const status = text(url.searchParams.get("status"), 30).toLowerCase();
  const search = text(url.searchParams.get("q"), 120);
  let sql = "SELECT * FROM cars WHERE 1=1";
  const params = [];
  if (status) { sql += " AND status=?"; params.push(status); }
  if (search) { sql += " AND (brand LIKE ? OR model LIKE ? OR id LIKE ?)"; const s = `%${search}%`; params.push(s, s, s); }
  sql += " ORDER BY featured DESC, created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const q = await db.prepare(sql).bind(...params).all();
  return Promise.all((q.results || []).map(async car => ({ ...car, images: await imagesFor(db, car.id) })));
}

export async function handleAdminCars(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin/cars")) return null;
  if (!env.DB) return response({ error: "D1 chưa được kết nối" }, 503);
  const parts = url.pathname.replace(/^\/api\/admin\/cars\/?/, "").split("/").filter(Boolean);
  const id = parts[0] || "";
  if (request.method === "GET") {
    if (id) {
      if (!safeId(id)) return response({ error: "ID không hợp lệ" }, 400);
      const car = await env.DB.prepare("SELECT * FROM cars WHERE id=?").bind(id).first();
      if (!car) return response({ error: "Không tìm thấy xe" }, 404);
      return response({ car: { ...car, images: await imagesFor(env.DB, id) } });
    }
    return response({ cars: await listCars(env.DB, url) });
  }
  if (request.method === "DELETE") {
    if (!id || !safeId(id)) return response({ error: "ID không hợp lệ" }, 400);
    if ((request.headers.get("X-CMS-Confirm") || "").toLowerCase() !== "delete") return response({ error: "Thiếu X-CMS-Confirm: delete" }, 428);
    const existing = await env.DB.prepare("SELECT id,brand,model FROM cars WHERE id=?").bind(id).first();
    if (!existing) return response({ error: "Không tìm thấy xe" }, 404);
    await env.DB.batch([env.DB.prepare("DELETE FROM car_images WHERE car_id=?").bind(id), env.DB.prepare("DELETE FROM cars WHERE id=?").bind(id)]);
    await audit(env.DB, "delete", "car", id, `${existing.brand} ${existing.model}`);
    return response({ ok: true, deleted: id });
  }
  if (request.method !== "POST" && request.method !== "PUT") return response({ error: "Method Not Allowed" }, 405, { Allow: "GET,POST,PUT,DELETE" });
  const body = await readJson(request);
  if (!body) return response({ error: "JSON không hợp lệ" }, 400);
  let existing = {};
  if (request.method === "PUT") {
    if (!id || !safeId(id)) return response({ error: "ID không hợp lệ" }, 400);
    existing = await env.DB.prepare("SELECT * FROM cars WHERE id=?").bind(id).first();
    if (!existing) return response({ error: "Không tìm thấy xe" }, 404);
  }
  const result = await saveCar(env.DB, body, { id: request.method === "POST" ? body.id : id, mode: request.method === "POST" ? "create" : "update", actor: "cms" });
  if (!result.ok) return response({ error: result.error }, result.status);
  return response({ ok: true, id: result.id, car: result.car }, result.status);
}

async function handleCars(request, env, parts) {
  return handleAdminCars(new Request(new URL(`/api/admin/cars/${parts.join("/")}`, request.url), request), env);
}

async function handleLeads(request, env, parts) {
  const db = env.DB;
  const id = parts[0] ? integer(parts[0]) : 0;
  if (request.method === "GET") {
    const limit = Math.min(Math.max(integer(new URL(request.url).searchParams.get("limit"), 100), 1), 500);
    const q = await db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT ?").bind(limit).all();
    return response({ leads: q.results || [] });
  }
  if (!id) return response({ error: "ID lead không hợp lệ" }, 400);
  if (request.method === "DELETE") {
    if ((request.headers.get("X-CMS-Confirm") || "").toLowerCase() !== "delete") return response({ error: "Thiếu X-CMS-Confirm: delete" }, 428);
    await db.prepare("DELETE FROM leads WHERE id=?").bind(id).run();
    await audit(db, "delete", "lead", String(id), "lead deleted");
    return response({ ok: true, deleted: id });
  }
  if (request.method !== "PUT") return response({ error: "Method Not Allowed" }, 405, { Allow: "GET,PUT,DELETE" });
  const body = await readJson(request);
  const status = text(body?.status, 30).toLowerCase();
  if (!LEAD_STATUSES.has(status)) return response({ error: `status phải là: ${[...LEAD_STATUSES].join(", ")}` }, 400);
  await db.prepare("UPDATE leads SET status=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, text(body?.note, 3000), id).run();
  await audit(db, "update", "lead", String(id), `status=${status}`);
  return response({ ok: true, id });
}

async function handlePosts(request,env,parts){
 const id=parts[0]||"";const u=new URL(request.url);
 if(request.method==="GET"){if(id){const p=await getPost(env.DB,id);return p?response({post:p}):response({error:"Không tìm thấy bài viết"},404)}return response({posts:await listPosts(env.DB,{status:text(u.searchParams.get("status"),20),q:text(u.searchParams.get("q"),120),limit:u.searchParams.get("limit")||100})})}
 if(request.method==="POST"){const b=await readJson(request);if(!b)return response({error:"JSON không hợp lệ"},400);const x=await savePost(env.DB,b,{mode:"create",actor:"cms-api"});return response(x.ok?{ok:true,id:x.id,post:x.post}:{error:x.error},x.status)}
 if(request.method==="PUT"){if(!id)return response({error:"Thiếu ID bài viết"},400);const b=await readJson(request);if(!b)return response({error:"JSON không hợp lệ"},400);const x=await savePost(env.DB,b,{id,mode:"update",actor:"cms-api"});return response(x.ok?{ok:true,id:x.id,post:x.post}:{error:x.error},x.status)}
 if(request.method==="DELETE"){if(!id)return response({error:"Thiếu ID bài viết"},400);if((request.headers.get("X-CMS-Confirm")||"").toLowerCase()!=="delete")return response({error:"Thiếu X-CMS-Confirm: delete"},428);const x=await deletePost(env.DB,id,{actor:"cms-api"});return response(x.ok?{ok:true,deleted:x.id}:{error:x.error},x.status)}
 return response({error:"Method Not Allowed"},405,{Allow:"GET,POST,PUT,DELETE"});
}

async function dashboard(db) {
  const rows = await Promise.all([
    ["cars", "SELECT COUNT(*) n FROM cars"], ["featured", "SELECT COUNT(*) n FROM cars WHERE featured=1"], ["available", "SELECT COUNT(*) n FROM cars WHERE status='available'"], ["reserved", "SELECT COUNT(*) n FROM cars WHERE status='reserved'"], ["sold", "SELECT COUNT(*) n FROM cars WHERE status='sold'"], ["hidden", "SELECT COUNT(*) n FROM cars WHERE status='hidden'"], ["leads", "SELECT COUNT(*) n FROM leads"], ["newLeads", "SELECT COUNT(*) n FROM leads WHERE status='new'"], ["wonLeads", "SELECT COUNT(*) n FROM leads WHERE status='won'"], ["auditEvents", "SELECT COUNT(*) n FROM cms_audit_log"], ["posts", "SELECT COUNT(*) n FROM posts"], ["publishedPosts", "SELECT COUNT(*) n FROM posts WHERE status='published'"]
  ].map(async ([key, sql]) => [key, Number((await db.prepare(sql).first("n")) || 0)]));
  return Object.fromEntries(rows);
}
async function handleAudit(request, env) { if (request.method !== "GET") return response({ error: "Method Not Allowed" }, 405, { Allow: "GET" }); const q = await env.DB.prepare("SELECT id,actor,action,resource,resource_id,summary,created_at FROM cms_audit_log ORDER BY created_at DESC LIMIT 200").all(); return response({ events: q.results || [] }); }

export async function handleCmsApi(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/cms/v1")) return null;
  if (!authorized(request, env)) return response({ error: "Unauthorized" }, 401, { "WWW-Authenticate": "Bearer" });
  if (!env.DB) return response({ error: "D1 chưa được kết nối" }, 503);
  try {
    await initCmsDb(env.DB);
    const rest = url.pathname.replace(/^\/api\/cms\/v1\/?/, "").split("/").filter(Boolean);
    const resource = rest[0] || "";
    const parts = rest.slice(1);
    if (resource === "health" && request.method === "GET") return response({ ok: true, service: "phanthuanxtra-cms", version: "1.0" });
    if (resource === "dashboard") return response({ stats: await dashboard(env.DB) });
    if (resource === "audit") return handleAudit(request, env);
    if (resource === "cars") return handleCars(request, env, parts);
    if (resource === "leads") return handleLeads(request, env, parts);
    if (resource === "posts") return handlePosts(request, env, parts);
    return response({ error: "CMS endpoint not found" }, 404);
  } catch (error) { console.error("CMS API error", error); return response({ error: "Internal Server Error" }, 500); }
}
