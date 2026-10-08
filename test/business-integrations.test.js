import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  businessIntegrationConfig,
  handleBusinessIntegrations,
  sendBrevoLeadNotification,
} from "../src/business-integrations.js";

test("tawk public config is fail-closed and only exposes validated public ids", async () => {
  assert.deepEqual(businessIntegrationConfig({}), { tawk: { enabled: false } });
  assert.deepEqual(
    businessIntegrationConfig({ TAWK_PROPERTY_ID: "abc123DEF456", TAWK_WIDGET_ID: "widget_123456" }),
    { tawk: { enabled: true, property_id: "abc123DEF456", widget_id: "widget_123456" } }
  );
  assert.deepEqual(
    businessIntegrationConfig({ TAWK_PROPERTY_ID: "https://evil.invalid/x", TAWK_WIDGET_ID: "widget_123456" }),
    { tawk: { enabled: false } }
  );
  const response = await handleBusinessIntegrations(
    new Request("https://phanthuanxtra.com/api/integrations/public-config"),
    {}
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, tawk: { enabled: false } });
});

test("Brevo integration skips cleanly without credentials and never makes a network call", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("must not call"); };
  try {
    const result = await sendBrevoLeadNotification({}, { leadId: 1, phone: "0866997891" });
    assert.equal(result.skipped, true);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("analytics export is bearer-protected and returns aggregate-only metrics", async () => {
  const values = new Map([
    ["SELECT COUNT(*) n FROM cars", 10],
    ["SELECT COUNT(*) n FROM cars WHERE status='available'", 6],
    ["SELECT COUNT(*) n FROM cars WHERE status='reserved'", 1],
    ["SELECT COUNT(*) n FROM cars WHERE status='sold'", 2],
    ["SELECT COUNT(*) n FROM cars WHERE status='hidden'", 1],
    ["SELECT COUNT(*) n FROM leads", 20],
    ["SELECT COUNT(*) n FROM leads WHERE status='new'", 5],
    ["SELECT COUNT(*) n FROM leads WHERE status='contacted'", 4],
    ["SELECT COUNT(*) n FROM leads WHERE status='qualified'", 3],
    ["SELECT COUNT(*) n FROM leads WHERE status='won'", 2],
    ["SELECT COUNT(*) n FROM leads WHERE status='lost'", 6],
    ["SELECT COUNT(*) n FROM posts WHERE status='published'", 8],
    ["SELECT COUNT(*) n FROM posts WHERE status='draft'", 2],
    ["SELECT COUNT(*) n FROM xtra_memory_customers", 12],
  ]);
  const DB = {
    prepare(sql) {
      return {
        async first() {
          if (sql.includes("follow_up_at")) return 3;
          return values.get(sql) ?? 0;
        }
      };
    }
  };
  const testToken = ["aggregate", "test", "token"].join("-");
  const env = { ANALYTICS_EXPORT_TOKEN: testToken, DB };

  const unauthorized = await handleBusinessIntegrations(
    new Request("https://phanthuanxtra.com/api/analytics/summary"),
    env
  );
  assert.equal(unauthorized.status, 401);

  const response = await handleBusinessIntegrations(
    new Request("https://phanthuanxtra.com/api/analytics/summary", {
      headers: { authorization: `Bearer ${testToken}` }
    }),
    env
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.privacy, "aggregate-only-no-pii");
  assert.equal(data.stats.cars_total, 10);
  assert.equal(data.stats.leads_total, 20);
  assert.equal(data.stats.follow_ups_due, 3);
  assert.equal("phone" in data.stats, false);
  assert.equal("email" in data.stats, false);
  assert.equal("message" in data.stats, false);
});

test("production wiring keeps third-party integrations opt-in and secret-backed", () => {
  const index = fs.readFileSync("src/index.js", "utf8");
  const entry = fs.readFileSync("src/entry.js", "utf8");
  const script = fs.readFileSync("public/script.js", "utf8");
  const page = fs.readFileSync("public/index.html", "utf8");
  const deploy = fs.readFileSync("scripts/deploy-cloudflare-api.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");
  const sonar = fs.readFileSync(".github/workflows/sonarqube-cloud.yml", "utf8");
  const runtimeVerify = fs.readFileSync("scripts/verify-business-integrations.mjs", "utf8");

  assert.match(index, /sendBrevoLeadNotification/);
  assert.match(entry, /handleBusinessIntegrations/);
  assert.match(page, /id="liveChatOpen"[^>]+hidden/);
  assert.match(script, /https:\/\/embed\.tawk\.to\//);
  assert.match(script, /api\/integrations\/public-config/);
  assert.doesNotMatch(script, /addEventListener\("click",loadTawk,\{once:true\}\)/);
  assert.ok(deploy.includes("BREVO_API_KEY"), "deploy controller missing Cloudflare-only Brevo guard");
  assert.ok(!workflow.includes("BREVO_API_KEY"), "deploy workflow must not source BREVO_API_KEY from GitHub");
  for (const name of ["BREVO_SENDER_EMAIL","BREVO_TO_EMAIL","TAWK_PROPERTY_ID","TAWK_WIDGET_ID","ANALYTICS_EXPORT_TOKEN"]) {
    assert.ok(deploy.includes(name), "deploy controller missing " + name);
    assert.ok(workflow.includes(name), "deploy workflow missing " + name);
  }
  assert.match(sonar, /SonarSource\/sonarqube-scan-action@v8\.3\.0/);
  assert.match(sonar, /sonar\.qualitygate\.wait=true/);
  assert.match(workflow, /verify-business-integrations\.mjs/);
  assert.match(runtimeVerify, /api\/integrations\/public-config/);
  assert.match(runtimeVerify, /api\/analytics\/summary/);
  assert.match(runtimeVerify, /Cloudflare API key binding is verified by the deploy step/);
});

test("Data Studio connector reads aggregate endpoint and does not request lead PII fields", () => {
  const connector = fs.readFileSync("integrations/data-studio/Code.gs", "utf8");
  assert.match(connector, /api\/analytics\/summary/);
  assert.match(connector, /ANALYTICS_EXPORT_TOKEN/);
  assert.match(connector, /function isAdminUser\(\) \{\s*return false;/);
  assert.doesNotMatch(connector, /\bphone\b|\bemail\b|\bmessage\b/i);
});


test("deployment controller refuses a missing Cloudflare Brevo secret and does not source it from GitHub", () => {
  const deploy = fs.readFileSync("scripts/deploy-cloudflare-api.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");
  assert.match(deploy, /currentBindings\.some\(binding => binding\.name === "BREVO_API_KEY" && binding\.type === "secret_text"\)/);
  assert.match(deploy, /BREVO_API_KEY must already exist as a Cloudflare secret_text binding/);
  assert.doesNotMatch(workflow, /BREVO_API_KEY:\s*\$\{\{\s*secrets\.BREVO_API_KEY/);
});


test("production E2E checks honor reversible archive instead of physical deletion", () => {
  const fsSmoke = fs.readFileSync(".github/workflows/production-smoke-gate15.yml", "utf8");
  const fsQueue = fs.readFileSync(".github/workflows/queue-01-e2e-origin.yml", "utf8");
  for (const workflow of [fsSmoke, fsQueue]) {
    assert.match(workflow, /\.archived == env\.TEST_CAR_ID/);
    assert.match(workflow, /\.visibility == "hidden"/);
    assert.doesNotMatch(workflow, /\.deleted == env\.TEST_CAR_ID/);
  }
  assert.match(fsQueue, /\.car\.status == "hidden"/);
  assert.match(fsSmoke, /admin-detail\.json/);
});


test("smoke gate checks archived vehicle hidden status and public detail denial", () => {
  const workflow = fs.readFileSync(".github/workflows/production-smoke-gate15.yml", "utf8");
  assert.match(workflow, /admin-archived-detail\.json/);
  assert.match(workflow, /\.car\.status == "hidden"/);
  assert.match(workflow, /public_status.*404/);
  assert.doesNotMatch(workflow, /\(\.cars \| any\(\.\[\]; \.id == \$id\)\) \| not/);
});


test("Brevo production verifier checks sender/recipient without requesting Cloudflare-only API key", () => {
  const verifier = fs.readFileSync("scripts/verify-business-integrations.mjs", "utf8");
  const deploy = fs.readFileSync("scripts/deploy-cloudflare-api.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");
  assert.match(verifier, /Brevo production email configuration is partial/);
  assert.match(verifier, /if \(!sender && !recipient\)/);
  assert.match(verifier, /if \(!sender \|\| !recipient\)/);
  assert.doesNotMatch(verifier, /const apiKey = clean\(process\.env\.BREVO_API_KEY/);
  assert.match(deploy, /BREVO_API_KEY must already exist as a Cloudflare secret_text binding/);
  assert.doesNotMatch(workflow, /BREVO_API_KEY:\s*\$\{\{\s*secrets\.BREVO_API_KEY/);
});


const brevoTestEnv = () => ({
  ADMIN_TOKEN: ["owner", "token", "fixture"].join("-"),
  BREVO_API_KEY: ["provider", "secret", "fixture"].join("-"),
  BREVO_SENDER_EMAIL: "contact@phanthuanxtra.com",
  BREVO_TO_EMAIL: "phanthuanmodelactor@gmail.com",
  DB: {
    prepare(sql) {
      let bound = [];
      return {
        bind(...values) { bound = values; return this; },
        async first() {
          assert.match(sql, /SELECT COUNT\(\*\) n FROM cms_audit_log/);
          return { n: 0 };
        },
        async run() {
          assert.match(sql, /INSERT INTO cms_audit_log/);
          assert.ok(bound[0]);
          return { success: true };
        }
      };
    }
  }
});
const probeRequest = (env, method = "POST", confirm = "send-one-brevo-test-email") =>
  new Request("https://phanthuanxtra.com/api/admin/integrations/brevo/diagnostic", {
    method, headers: { authorization: "Bearer " + env.ADMIN_TOKEN, "content-type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify({ confirm }) } : {})
  });

test("Brevo diagnostic is owner-only, reports presence not secrets, and requires explicit confirmation", async t => {
  const env = brevoTestEnv();
  let outbound = 0;
  t.mock.method(globalThis, "fetch", async () => { outbound++; throw Error("unexpected outbound request"); });
  const url = "https://phanthuanxtra.com/api/admin/integrations/brevo/diagnostic";
  const unauth = await handleBusinessIntegrations(new Request(url), env);
  assert.equal(unauth.status, 401);
  const get = await handleBusinessIntegrations(probeRequest(env, "GET"), env);
  assert.equal(get.status, 200);
  const status = await get.json();
  assert.deepEqual(status, { ok: true, configured: true, api_key_present: true, sender_valid: true, recipient_valid: true });
  assert.ok(!JSON.stringify(status).includes(env.BREVO_API_KEY));
  const noConfirmation = await handleBusinessIntegrations(probeRequest(env, "POST", "no"), env);
  assert.equal(noConfirmation.status, 400);
  assert.equal(outbound, 0);
});

test("Brevo diagnostic sends exactly one PII-free email to configured recipient and returns provider evidence", async t => {
  const env = brevoTestEnv();
  const audit = [];
  const realPrepare = env.DB.prepare;
  env.DB.prepare = sql => {
    const statement = realPrepare(sql);
    const oldBind = statement.bind;
    statement.bind = (...args) => {
      if (sql.includes("INSERT INTO cms_audit_log")) audit.push({ sql, args });
      return oldBind.apply(statement, args);
    };
    return statement;
  };
  let sends = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    sends++;
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["api-key"], env.BREVO_API_KEY);
    const payload = JSON.parse(options.body);
    assert.equal(payload.to[0].email, env.BREVO_TO_EMAIL);
    assert.equal(payload.sender.email, env.BREVO_SENDER_EMAIL);
    assert.deepEqual(payload.tags, ["integration-diagnostic"]);
    assert.match(payload.subject, /Brevo diagnostic/);
    assert.doesNotMatch(payload.textContent, /Lead ID:|Điện thoại:|Họ tên:/);
    return Response.json({ messageId: "test-123@brevo.local" }, { status: 201 });
  });
  const response = await handleBusinessIntegrations(probeRequest(env), env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.accepted_by_provider, true);
  assert.equal(result.status, 201);
  assert.equal(result.message_id, "test-123@brevo.local");
  assert.match(result.test_id, /^[a-f0-9-]{36}$/);
  assert.equal(sends, 1);
  assert.equal(audit.length, 2);
  assert.ok(!JSON.stringify(result).includes(env.BREVO_API_KEY));
  assert.ok(!JSON.stringify(audit).includes(env.BREVO_API_KEY));
});

test("Brevo diagnostic returns sanitized upstream failures, never raw provider text", async t => {
  const env = brevoTestEnv();
  t.mock.method(globalThis, "fetch", async () => Response.json({
    code: "permission_denied", message: "Do not expose customer details or provider internal response"
  }, { status: 403 }));
  const res = await handleBusinessIntegrations(probeRequest(env), env);
  const data = await res.json();
  assert.equal(res.status, 502);
  assert.equal(data.status, 403);
  assert.equal(data.provider_code, "permission_denied");
  assert.equal(data.accepted_by_provider, false);
  assert.ok(!JSON.stringify(data).includes("customer details"));
});

test("Brevo diagnostic rate-limits owner requests and fails closed when bindings are incomplete", async t => {
  const env = brevoTestEnv();
  env.DB.prepare = () => ({ bind() { return this; }, async first() { return { n: 3 }; } });
  let sent = false;
  t.mock.method(globalThis, "fetch", async () => { sent = true; throw Error("unexpected network"); });
  const limited = await handleBusinessIntegrations(probeRequest(env), env);
  assert.equal(limited.status, 429);
  assert.equal(sent, false);
  delete env.BREVO_API_KEY;
  const incomplete = await handleBusinessIntegrations(probeRequest(env), env);
  assert.equal(incomplete.status, 503);
  assert.equal((await incomplete.json()).api_key_present, false);
  assert.equal(sent, false);
});
