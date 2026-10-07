const BASE = "https://phanthuanxtra.com";

const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const validTawkId = (value) => /^[A-Za-z0-9_-]{6,80}$/.test(clean(value, 80));
const readJson = async (response) => {
  const raw = await response.text();
  try { return JSON.parse(raw); }
  catch { throw new Error(`Expected JSON from ${response.url}; got HTTP ${response.status}`); }
};
const request = (path, options = {}) =>
  fetch(BASE + path, { redirect: "error", signal: AbortSignal.timeout(20000), ...options });

async function verifyPublicConfig() {
  const response = await request("/api/integrations/public-config?production-verify=1", {
    headers: { accept: "application/json" },
  });
  if (response.status !== 200) throw new Error(`Public integration config HTTP ${response.status}`);
  const data = await readJson(response);
  if (data?.ok !== true || typeof data?.tawk?.enabled !== "boolean") throw new Error("Invalid public integration config payload.");

  const property = clean(process.env.TAWK_PROPERTY_ID, 80);
  const widget = clean(process.env.TAWK_WIDGET_ID, 80);
  const fullyConfigured = validTawkId(property) && validTawkId(widget);
  const partiallyConfigured = Boolean(property || widget) && !fullyConfigured;

  if (partiallyConfigured) throw new Error("tawk.to configuration is partial or invalid.");
  if (!fullyConfigured) {
    if (data.tawk.enabled !== false) throw new Error("tawk.to must stay disabled without complete configuration.");
    console.log("tawk.to: DEFERRED; public endpoint is fail-closed.");
    return;
  }
  if (!data.tawk.enabled || data.tawk.property_id !== property || data.tawk.widget_id !== widget) {
    throw new Error("tawk.to production config does not match deployed bindings.");
  }
  console.log("tawk.to: PASS; deployed public config matches configured widget.");
}

async function verifyAnalytics() {
  const token = clean(process.env.ANALYTICS_EXPORT_TOKEN, 500);
  const unauth = await request("/api/analytics/summary?production-verify=1", {
    headers: { accept: "application/json" },
  });

  if (!token) {
    if (unauth.status !== 503) throw new Error(`Analytics without token must fail closed with 503; got HTTP ${unauth.status}`);
    console.log("Data Studio analytics: DEFERRED; production endpoint is fail-closed HTTP 503.");
    return;
  }
  if (unauth.status !== 401) throw new Error(`Analytics unauthenticated request must return 401; got HTTP ${unauth.status}`);

  const response = await request("/api/analytics/summary?production-verify=1", {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  if (response.status !== 200) throw new Error(`Authenticated analytics HTTP ${response.status}`);
  const data = await readJson(response);
  if (data?.ok !== true || data?.privacy !== "aggregate-only-no-pii" || !data?.stats || typeof data.stats !== "object") {
    throw new Error("Analytics aggregate privacy contract failed.");
  }
  const forbidden = new Set(["name","phone","email","message","ip","address","cookie","user_agent","customer_memory"]);
  for (const key of Object.keys(data.stats)) {
    if (forbidden.has(String(key).toLowerCase())) throw new Error(`Analytics response contains forbidden field: ${key}`);
  }
  console.log("Data Studio analytics: PASS; Bearer auth and aggregate-only response verified.");
}

function verifyBrevoConfiguration() {
  const apiKey = clean(process.env.BREVO_API_KEY, 500);
  const sender = clean(process.env.BREVO_SENDER_EMAIL, 254);
  const recipient = clean(process.env.BREVO_TO_EMAIL, 254);
  const configured = [apiKey, sender, recipient].filter(Boolean).length;
  if (configured === 0) {
    console.log("Brevo: DEFERRED; no production provider request made.");
    return;
  }
  if (configured !== 3) throw new Error("Brevo production configuration is partial.");
  console.log("Brevo: CONFIGURED; runtime adapter is enabled. Provider delivery requires a separate real lead/sandbox proof.");
}

await verifyPublicConfig();
await verifyAnalytics();
verifyBrevoConfiguration();
console.log("Business integrations production boundary verification completed.");
