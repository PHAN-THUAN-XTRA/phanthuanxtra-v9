import { analyzeVehicleImage } from "./vehicle-ai.js";
import { createPtXtraPlateImage, hasValidPlateBox } from "./plate-branding.js";
import { verifyAdminToken } from "./admin-auth.js";

const MAX_IMAGES = 30;
const MAX_BYTES = 12 * 1024 * 1024;
const clean = v => String(v ?? "").trim();
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
async function auth(request, env) { return (await verifyAdminToken(request, env)).ok; }
function isTrusted(url) { return /^https:\/\/phanthuanxtra\.com\/media\/vehicles\/publish-(?:admin-)?[a-z0-9._-]+\.jpg$/i.test(clean(url)); }
async function fetchImage(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Ảnh Admin phải là URL HTTP(S) để đưa qua AI.");
  const u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw new Error("URL ảnh không hợp lệ.");
  const response = await fetch(u.toString(), { redirect: "manual" }); if (response.status >= 300 && response.status < 400) throw new Error("Ảnh Admin không được phép redirect."); if (!response.ok) throw new Error(`Không tải được ảnh Admin: HTTP ${response.status}`);
  const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase(); if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw new Error("URL không trỏ tới JPEG/PNG/WebP.");
  const declared = Number(response.headers.get("content-length") || 0); if (declared > MAX_BYTES) throw new Error("Ảnh Admin vượt quá 12MB.");
  const bytes = await response.arrayBuffer(); if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new Error("Ảnh Admin vượt quá 12MB."); return { bytes, contentType };
}
async function brandOne(env, url, index, carId) {
  if (isTrusted(url)) return { url, branded: true, reused: true };
  const { bytes, contentType } = await fetchImage(url); const ai = await analyzeVehicleImage(env, bytes, contentType, `Admin upload xe ${carId || ""}`);
  if (!hasValidPlateBox(ai?.plate_bbox)) return { url, branded: false, reused: false, ai };
  const safeId = clean(carId).replace(/[^a-z0-9_-]/gi, "_").slice(0, 80) || "vehicle";
  const key = `vehicles/publish-admin-${safeId}-${crypto.randomUUID()}.jpg`;
  await createPtXtraPlateImage(env, bytes, contentType, ai.plate_bbox, key);
  return { url: `https://phanthuanxtra.com/media/${encodeURIComponent(key)}`, branded: true, reused: false, ai };
}
export async function handleAdminVehiclePipeline(request, env) {
  const url = new URL(request.url); if (url.pathname !== "/api/admin/cars" || !["POST", "PUT"].includes(request.method)) return null;
  if (!(await auth(request, env))) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.images) || body.images.length === 0) return json({ error: "Admin đăng xe bắt buộc phải có ít nhất 1 ảnh để AI kiểm tra và branding PT Xtra." }, 400);
  const images = body.images.slice(0, MAX_IMAGES).map(x => clean(typeof x === "string" ? x : x?.url)).filter(Boolean); if (!images.length) return json({ error: "Không có URL ảnh hợp lệ." }, 400);
  try {
    const processed = []; for (let i = 0; i < images.length; i++) processed.push(await brandOne(env, images[i], i, body.id));
    const nextImages = processed.map((x, i) => ({ url: x.url, sort_order: i, is_cover: i === 0 }));
    const next = { ...body, images: nextImages, cover_image: nextImages[0].url };
    const headers = new Headers(request.headers); headers.set("content-type", "application/json");
    return new Request(request, { method: request.method, headers, body: JSON.stringify(next) });
  } catch (error) { return json({ error: clean(error?.message) || "AI branding PT Xtra thất bại; bài đăng bị chặn." }, 422); }
}
export { isTrusted };
