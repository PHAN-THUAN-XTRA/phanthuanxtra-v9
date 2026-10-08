import { verifyBrevoDiagnosticAuth } from "./brevo-diagnostic-auth.js";

const SEC = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const validEmail = (value) => {
  const email = clean(value, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};
const validPublicId = (value) => {
  const id = clean(value, 80);
  return /^[A-Za-z0-9_-]{6,80}$/.test(id) ? id : "";
};
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...SEC, ...extra } });

export function businessIntegrationConfig(env = {}) {
  const propertyId = validPublicId(env.TAWK_PROPERTY_ID);
  const widgetId = validPublicId(env.TAWK_WIDGET_ID);
  if (!propertyId || !widgetId) return { tawk: { enabled: false } };
  return { tawk: { enabled: true, property_id: propertyId, widget_id: widgetId } };
}

// Provider diagnostics contain only status and a bounded error code; never log API
// keys, customer fields, request bodies, or arbitrary upstream response messages.
const providerCode = value => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(String(value ?? "")) ? String(value) : "unknown";
const safeMessageId = value => /^[A-Za-z0-9@._<>-]{1,200}$/.test(String(value ?? "")) ? String(value) : null;
const brevoConfig = env => ({
  key: clean(env.BREVO_API_KEY, 500),
  sender: validEmail(env.BREVO_SENDER_EMAIL),
  recipient: validEmail(env.BREVO_TO_EMAIL),
});

async function sendBrevoEmail(env, { subject, textContent, kind, tags }) {
  const { key, sender, recipient } = brevoConfig(env);
  if (!key || !sender || !recipient) {
    console.warn("brevo_send_skipped", JSON.stringify({ kind, reason: "not_configured", api_key_present: !!key, sender_valid: !!sender, recipient_valid: !!recipient }));
    return { ok: false, skipped: true, reason: "not_configured" };
  }
  console.info("brevo_send_attempt", JSON.stringify({ kind, endpoint: "smtp/email" }));
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "api-key": key },
      body: JSON.stringify({
        sender: { name: "PHAN THUẦN XTRA", email: sender },
        to: [{ email: recipient, name: "PHAN THUẦN XTRA CRM", contactPixelTrackingConsent: false }],
        subject, textContent, tags,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    // Only known machine-readable fields are read from the provider response.
    const payload = await response.json().catch(() => ({}));
    const code = response.ok ? null : providerCode(payload?.code);
    const messageId = response.ok ? safeMessageId(payload?.messageId) : null;
    const outcome = { ok: response.ok, status: response.status, ...(code ? { provider_code: code } : {}), ...(messageId ? { message_id: messageId } : {}) };
    console[response.ok ? "info" : "warn"]("brevo_send_result", JSON.stringify({ kind, status: response.status, ...(code ? { provider_code: code } : {}) }));
    return outcome;
  } catch (error) {
    // Network and timeout errors can contain sensitive request data in .message.
    const type = error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : "network_error";
    console.warn("brevo_send_result", JSON.stringify({ kind, status: 0, provider_code: type }));
    return { ok: false, status: 0, provider_code: type };
  }
}

export async function sendBrevoLeadNotification(env = {}, lead = {}) {
  const leadId = Number.isFinite(Number(lead.leadId)) ? Number(lead.leadId) : null;
  const source = clean(lead.source || "website-lead", 60);
  const subject = `PHAN THUẦN XTRA — lead ${leadId ? "#" + leadId : "mới"}`;
  const textContent = [
    "Có lead mới từ phanthuanxtra.com.",
    leadId ? `Lead ID: ${leadId}` : "",
    `Nguồn: ${source}`,
    `Họ tên: ${clean(lead.name, 120) || "(không cung cấp)"}`,
    `Điện thoại: ${clean(lead.phone, 40) || "(không cung cấp)"}`,
    `Xe/dịch vụ: ${clean(lead.carId, 120) || "(không chỉ định)"}`,
    `Nội dung: ${clean(lead.message, 2000) || "(không có)"}`,
  ].filter(Boolean).join("\n");
  return sendBrevoEmail(env, { subject, textContent, kind: "lead", tags: ["website-lead"] });
}

async function handleBrevoAdminDiagnostic(request, env) {
  const auth = await verifyBrevoDiagnosticAuth(request, env);
  if (!auth.ok) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "GET" && request.method !== "POST") return json({ error: "Method Not Allowed" }, 405, { allow: "GET, POST" });
  const { key, sender, recipient } = brevoConfig(env);
  const configured = !!(key && sender && recipient);
  if (request.method === "GET") return json({ ok: true, configured, api_key_present: !!key, sender_valid: !!sender, recipient_valid: !!recipient });
  if (!configured) return json({ ok: false, reason: "not_configured", api_key_present: !!key, sender_valid: !!sender, recipient_valid: !!recipient }, 503);
  if (!env.DB) return json({ ok: false, reason: "audit_unavailable" }, 503);
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return json({ error: "JSON_REQUIRED" }, 415);
  const body = await request.json().catch(() => null);
  if (body?.confirm !== "send-one-brevo-test-email") return json({ error: "CONFIRMATION_REQUIRED" }, 400);
  // Explicit owner action, limited to three attempts per hour. No real lead row
  // or customer data is created; the destination is the configured mailbox only.
  const attempts = Number(await env.DB.prepare("SELECT COUNT(*) n FROM cms_audit_log WHERE actor='brevo-diagnostic' AND action='send-attempt' AND created_at>=datetime('now','-1 hour')").first("n"));
  if (attempts >= 3) return json({ error: "BREVO_TEST_RATE_LIMIT", retry_later: true }, 429);
  // Prevent a replay of an authenticated CI request from sending another email.
  // The signature is method/path/nonce/timestamp-bound and expires after 120s.
  if (auth.principal === "ci") {
    const replayed = Number(await env.DB.prepare("SELECT COUNT(*) n FROM cms_audit_log WHERE actor='brevo-diagnostic' AND action='send-attempt' AND resource_id=?").bind(auth.nonce).first("n"));
    if (replayed > 0) return json({ error: "BREVO_TEST_REPLAY" }, 409);
  }
  const testId = auth.principal === "ci" ? auth.nonce : crypto.randomUUID();
  await env.DB.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES ('brevo-diagnostic','send-attempt','integration',?,'Brevo transactional diagnostic; no customer data')").bind(testId).run();
  const result = await sendBrevoEmail(env, {
    subject: `PHAN THUẦN XTRA — Brevo diagnostic ${testId.slice(0, 8)}`,
    textContent: "Đây là email kiểm thử tích hợp Brevo từ Cloudflare Worker. Không chứa dữ liệu khách hàng.",
    kind: "diagnostic", tags: ["integration-diagnostic"],
  });
  const summary = `http=${result.status ?? 0};code=${providerCode(result.provider_code || (result.ok ? "accepted" : "unknown"))}`;
  try {
    await env.DB.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES ('brevo-diagnostic','send-result','integration',?,?)").bind(testId, summary).run();
  } catch { console.warn("brevo_diagnostic_audit_result_failed"); }
  return json({ ...result, test_id: testId, accepted_by_provider: result.ok === true }, result.ok ? 200 : 502);
}

async function count(db, sql) {
  try {
    return Number(await db.prepare(sql).first("n") || 0);
  } catch {
    return 0;
  }
}

export async function handleBusinessIntegrations(request, env = {}) {
  const url = new URL(request.url);

  if (url.pathname === "/api/integrations/public-config") {
    if (request.method !== "GET") return json({ error: "Method Not Allowed" }, 405, { allow: "GET" });
    return json({ ok: true, ...businessIntegrationConfig(env) });
  }

  if (url.pathname === "/api/admin/integrations/brevo/diagnostic") return handleBrevoAdminDiagnostic(request, env);

  if (url.pathname !== "/api/analytics/summary") return null;
  if (request.method !== "GET") return json({ error: "Method Not Allowed" }, 405, { allow: "GET" });

  const token = clean(env.ANALYTICS_EXPORT_TOKEN, 500);
  if (!token) return json({ error: "Analytics export chưa được cấu hình" }, 503);
  if ((request.headers.get("authorization") || "") !== `Bearer ${token}`) {
    return json({ error: "Unauthorized" }, 401, { "www-authenticate": "Bearer", vary: "Authorization" });
  }
  if (!env.DB) return json({ error: "D1 chưa được kết nối" }, 503);

  const [
    carsTotal, carsAvailable, carsReserved, carsSold, carsHidden,
    leadsTotal, leadsNew, leadsContacted, leadsQualified, leadsWon, leadsLost,
    postsPublished, postsDraft, customers, followUpsDue
  ] = await Promise.all([
    count(env.DB, "SELECT COUNT(*) n FROM cars"),
    count(env.DB, "SELECT COUNT(*) n FROM cars WHERE status='available'"),
    count(env.DB, "SELECT COUNT(*) n FROM cars WHERE status='reserved'"),
    count(env.DB, "SELECT COUNT(*) n FROM cars WHERE status='sold'"),
    count(env.DB, "SELECT COUNT(*) n FROM cars WHERE status='hidden'"),
    count(env.DB, "SELECT COUNT(*) n FROM leads"),
    count(env.DB, "SELECT COUNT(*) n FROM leads WHERE status='new'"),
    count(env.DB, "SELECT COUNT(*) n FROM leads WHERE status='contacted'"),
    count(env.DB, "SELECT COUNT(*) n FROM leads WHERE status='qualified'"),
    count(env.DB, "SELECT COUNT(*) n FROM leads WHERE status='won'"),
    count(env.DB, "SELECT COUNT(*) n FROM leads WHERE status='lost'"),
    count(env.DB, "SELECT COUNT(*) n FROM posts WHERE status='published'"),
    count(env.DB, "SELECT COUNT(*) n FROM posts WHERE status='draft'"),
    count(env.DB, "SELECT COUNT(*) n FROM xtra_memory_customers"),
    count(env.DB, "SELECT COUNT(*) n FROM xtra_customer_care WHERE follow_up_at IS NOT NULL AND follow_up_at<=CURRENT_TIMESTAMP AND care_status NOT IN ('won','lost')"),
  ]);

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    privacy: "aggregate-only-no-pii",
    stats: {
      cars_total: carsTotal,
      cars_available: carsAvailable,
      cars_reserved: carsReserved,
      cars_sold: carsSold,
      cars_hidden: carsHidden,
      leads_total: leadsTotal,
      leads_new: leadsNew,
      leads_contacted: leadsContacted,
      leads_qualified: leadsQualified,
      leads_won: leadsWon,
      leads_lost: leadsLost,
      posts_published: postsPublished,
      posts_draft: postsDraft,
      customers_total: customers,
      follow_ups_due: followUpsDue,
    },
  }, 200, { vary: "Authorization" });
}
