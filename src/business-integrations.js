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

export async function sendBrevoLeadNotification(env = {}, lead = {}) {
  const apiKey = clean(env.BREVO_API_KEY, 500);
  const sender = validEmail(env.BREVO_SENDER_EMAIL);
  const recipient = validEmail(env.BREVO_TO_EMAIL);
  if (!apiKey || !sender || !recipient) return { ok: false, skipped: true, reason: "not_configured" };

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

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: "PHAN THUẦN XTRA", email: sender },
        to: [{ email: recipient, name: "PHAN THUẦN XTRA CRM", contactPixelTrackingConsent: false }],
        subject,
        textContent,
        tags: ["website-lead"],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn("brevo_lead_notify_failed", response.status);
      return { ok: false, status: response.status };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    console.warn("brevo_lead_notify_failed", clean(error?.message || error, 180));
    return { ok: false, status: 0 };
  }
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
