import { handleAdminCars } from "./cms.js";
import { publishCar } from "./telegram.js";
import { verifyAdminToken } from "./admin-auth.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max);

async function authorized(request, env) {
  const admin = await verifyAdminToken(request, env);
  if (admin.ok) return { ok: true, actor: "admin" };
  const auth = request.headers.get("Authorization") || "";
  if (env.CMS_API_KEY && auth === `Bearer ${env.CMS_API_KEY}`) return { ok: true, actor: "cms-api" };
  if (env.APP_API_TOKEN && auth === `Bearer ${env.APP_API_TOKEN}`) return { ok: true, actor: "app-api" };
  return { ok: false };
}

export async function handlePublishCore(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/publish/v1/cars") return null;
  if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  const auth = await authorized(request, env);
  if (!auth.ok) return json({ error: "Unauthorized" }, 401, { "WWW-Authenticate": "Bearer" });
  if (!env.DB) return json({ error: "D1 chưa được kết nối" }, 503);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "JSON không hợp lệ" }, 400);
  const carId = clean(body.id, 81);
  if (!carId) return json({ error: "id là bắt buộc" }, 400);

  const saveRequest = new Request(new URL("/api/admin/cars", request.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const saved = await handleAdminCars(saveRequest, env);
  if (!saved.ok) return saved;

  let telegram = null;
  if (body.outputs?.telegram === true) {
    try {
      telegram = await publishCar(env, carId);
    } catch (error) {
      return json({ ok: false, car_id: carId, website: "published", telegram: "failed", error: clean(error?.message || error, 1000) }, 502);
    }
  }
  return json({ ok: true, car_id: carId, website: "published", telegram: telegram ? "published" : "not_requested", actor: auth.actor }, 201);
}
