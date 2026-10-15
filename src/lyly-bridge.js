// Lyly-only read gateway. No D1/R2 mutation or general-purpose query execution.
const MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_ITEMS = 50;
const AI_MINUTE_LIMIT = 6; // Best effort per Worker isolate. Configure Cloudflare WAF for global limits.
const aiCalls = new Map();
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY"
};
const respond = (payload, status = 200, extra = {}) =>
  new Response(JSON.stringify(payload), { status, headers: { ...HEADERS, ...extra } });
const clamp = (value, fallback, max) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};
const isQuota = error => /3036|4006|quota|daily allocation|neurons|rate.limit|429/i.test(String(error?.message || error));
async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
async function authenticated(request, env) {
  const expected = env.LYLY_BRIDGE_TOKEN;
  const header = request.headers.get("authorization") || "";
  if (typeof expected !== "string" || expected.length < 32) return false;
  const match = /^Bearer ([A-Za-z0-9+/_=.-]{32,256})$/.exec(header);
  if (!match) return false;
  const [left, right] = await Promise.all([sha256(match[1]), sha256(expected)]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
function allowedAI(ip) {
  const now = Date.now();
  if (aiCalls.size > 500) aiCalls.clear();
  const state = aiCalls.get(ip);
  const current = !state || now - state.start >= 60_000 ? { start: now, count: 0 } : state;
  if (current.count >= AI_MINUTE_LIMIT) return false;
  current.count++;
  aiCalls.set(ip, current);
  return true;
}
// Workers AI model versions can return legacy response strings or OpenAI-style
// choices. Ignore reasoning_content and never surface internal reasoning.
function plainAIText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.filter(item => item?.type === "text" && typeof item?.text === "string")
      .map(item => item.text).join("\n").trim();
  }
  return "";
}
function extractAIAnswer(output) {
  if (typeof output === "string") return output.trim();
  const candidates = [
    output?.response,
    output?.choices?.[0]?.message?.content,
    output?.choices?.[0]?.text,
    output?.result?.response,
    output?.result?.choices?.[0]?.message?.content,
    output?.output_text
  ];
  for (const candidate of candidates) {
    const text = plainAIText(candidate);
    if (text) return text;
  }
  return "";
}
function outputFormat(output) {
  if (typeof output === "string") return "string";
  if (!output || typeof output !== "object") return "absent";
  if (Array.isArray(output.choices)) return "choices";
  if (Object.hasOwn(output, "response")) return "response";
  if (output.result && typeof output.result === "object") return "result";
  return "unrecognized";
}
async function readAI(request, env) {
  if (!env.AI || typeof env.AI.run !== "function") return respond({ ok: false, error: "Workers AI binding unavailable" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 8192) return respond({ ok: false, error: "Payload too large" }, 413);
  const raw = await request.text();
  if (raw.length > 8192) return respond({ ok: false, error: "Payload too large" }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return respond({ ok: false, error: "JSON không hợp lệ" }, 400); }
  const message = typeof input?.message === "string" ? input.message.trim() : "";
  if (!message || message.length > 2000) return respond({ ok: false, error: "message cần từ 1 đến 2000 ký tự" }, 400);
  // This is not an identity verifier. Never accept a user-claimed owner identity as authorization.
  const client = request.headers.get("cf-connecting-ip") || "unknown";
  if (!allowedAI(client)) return respond({ ok: false, error: "Giới hạn AI tạm thời. Thử lại sau một phút." }, 429, { "retry-after": "60" });
  try {
    const output = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: "Bạn là Lyly, trợ lý tiếng Việt của chủ sở hữu hệ thống. Trả lời rõ ràng, súc tích bằng tiếng Việt. Không bịa dữ liệu hoặc tuyên bố đã thao tác hệ thống. Không yêu cầu hay tiết lộ mật khẩu, khóa API. Không tự nhận đã xác thực danh tính giọng nói." },
        { role: "user", content: message }
      ],
      temperature: 0.2,
      // GLM-4.7-Flash supports reasoning; prevent its token budget from
      // being consumed by hidden reasoning without a final answer.
      reasoning_effort: "low",
      chat_template_kwargs: { enable_thinking: false },
      max_completion_tokens: 900
    });
    const answer = extractAIAnswer(output);
    if (!answer) {
      // Diagnostics never include model-generated text or request content.
      console.warn("lyly_workers_ai_empty_output", { model: MODEL, format: outputFormat(output) });
      return respond({ ok: false, error: "Mô hình chưa tạo được nội dung trả lời", code: "empty_model_response" }, 502);
    }
    return respond({ ok: true, model: MODEL, answer: answer.slice(0, 6000) });
  } catch (error) {
    if (isQuota(error)) return respond({ ok: false, error: "Cloudflare Workers AI hết hạn mức hoặc bị giới hạn. Không tự động gọi mô hình trả phí.", code: "quota_or_rate_limit" }, 429);
    console.warn("lyly_workers_ai_error", error?.name || "Error");
    return respond({ ok: false, error: "Workers AI tạm thời không khả dụng" }, 503);
  }
}
async function readD1(path, url, env) {
  if (!env.DB) return respond({ ok: false, error: "D1 binding unavailable" }, 503);
  const limit = clamp(url.searchParams.get("limit"), 15, MAX_ITEMS);
  try {
    if (path === "/api/lyly/d1/summary") {
      const [cars, posts, leads] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS n FROM cars").first(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM posts").first(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM leads").first()
      ]);
      return respond({ ok: true, source: "D1", counts: { cars: Number(cars?.n || 0), posts: Number(posts?.n || 0), leads: Number(leads?.n || 0) } });
    }
    if (path === "/api/lyly/d1/cars") {
      const data = await env.DB.prepare("SELECT id, brand, model, year, mileage, price, status, created_at FROM cars ORDER BY created_at DESC LIMIT ?").bind(limit).all();
      return respond({ ok: true, source: "D1", cars: data.results || [] });
    }
    if (path === "/api/lyly/d1/posts") {
      const data = await env.DB.prepare("SELECT id, title, slug, status, published_at FROM posts ORDER BY created_at DESC LIMIT ?").bind(limit).all();
      return respond({ ok: true, source: "D1", posts: data.results || [] });
    }
  } catch (error) {
    console.warn("lyly_d1_error", error?.name || "Error");
    return respond({ ok: false, error: "Không đọc được dữ liệu D1" }, 503);
  }
  return respond({ ok: false, error: "Not Found" }, 404);
}
async function readR2(url, env) {
  if (!env.MEDIA || typeof env.MEDIA.list !== "function") return respond({ ok: false, error: "R2 binding unavailable" }, 503);
  const prefix = url.searchParams.get("prefix") || "";
  if (prefix.length > 100 || !/^[A-Za-z0-9/_-]*$/.test(prefix) || prefix.includes("..")) {
    return respond({ ok: false, error: "prefix không hợp lệ" }, 400);
  }
  const limit = clamp(url.searchParams.get("limit"), 20, MAX_ITEMS);
  try {
    const result = await env.MEDIA.list({ prefix, limit });
    return respond({
      ok: true, source: "R2", prefix, truncated: result.truncated === true,
      files: (result.objects || []).map(obj => ({
        key: obj.key, size_bytes: obj.size,
        uploaded: obj.uploaded?.toISOString?.() || null
      }))
    });
  } catch (error) {
    console.warn("lyly_r2_error", error?.name || "Error");
    return respond({ ok: false, error: "Không đọc được metadata R2" }, 503);
  }
}
export async function handleLylyBridge(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (path !== "/api/lyly" && !path.startsWith("/api/lyly/")) return null;
  if (!env.LYLY_BRIDGE_TOKEN || String(env.LYLY_BRIDGE_TOKEN).length < 32) {
    return respond({ ok: false, error: "Cổng Lyly chưa được kích hoạt" }, 503);
  }
  if (!(await authenticated(request, env))) return respond({ ok: false, error: "Unauthorized" }, 401, { "www-authenticate": "Bearer" });
  const isAI = path === "/api/lyly/ai";
  if ((isAI && request.method !== "POST") || (!isAI && request.method !== "GET")) {
    return respond({ ok: false, error: "Method Not Allowed" }, 405, { allow: isAI ? "POST" : "GET" });
  }
  if (path === "/api/lyly/health") return respond({
    ok: true, worker: "phanthuanxtra-v2", gateway: "lyly-readonly-v1",
    bindings: { d1: Boolean(env.DB), r2: Boolean(env.MEDIA), workers_ai: Boolean(env.AI) },
    timestamp: new Date().toISOString()
  });
  if (path === "/api/lyly/ai") return readAI(request, env);
  if (path.startsWith("/api/lyly/d1/")) return readD1(path, url, env);
  if (path === "/api/lyly/r2") return readR2(url, env);
  return respond({ ok: false, error: "Not Found" }, 404);
}
