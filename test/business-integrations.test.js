import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { issueAdminToken } from "../src/admin-auth.js";
import { verifyBrevoDiagnosticAuth, BREVO_DIAGNOSTIC_PATH } from "../src/brevo-diagnostic-auth.js";
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
  ADMIN_PASSWORD: ["owner", "password", "fixture"].join("-"),
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
          return 0;
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
const probeRequest = async (env, method = "POST", confirm = "send-one-brevo-test-email") =>
  new Request("https://phanthuanxtra.com/api/admin/integrations/brevo/diagnostic", {
    method, headers: { authorization: "Bearer " + await issueAdminToken(env), "content-type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify({ confirm }) } : {})
  });

test("Brevo diagnostic is owner-only, reports presence not secrets, and requires explicit confirmation", async t => {
  const env = brevoTestEnv();
  let outbound = 0;
  t.mock.method(globalThis, "fetch", async () => { outbound++; throw Error("unexpected outbound request"); });
  const url = "https://phanthuanxtra.com/api/admin/integrations/brevo/diagnostic";
  const unauth = await handleBusinessIntegrations(new Request(url), env);
  assert.equal(unauth.status, 401);
  const get = await handleBusinessIntegrations(await probeRequest(env, "GET"), env);
  assert.equal(get.status, 200);
  const status = await get.json();
  assert.deepEqual(status, { ok: true, configured: true, api_key_present: true, sender_valid: true, recipient_valid: true });
  assert.ok(!JSON.stringify(status).includes(env.BREVO_API_KEY));
  const noConfirmation = await handleBusinessIntegrations(await probeRequest(env, "POST", "no"), env);
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
    assert.equal(options.redirect, "manual");
    assert.equal(options.headers["api-key"], env.BREVO_API_KEY);
    const payload = JSON.parse(options.body);
    assert.equal(payload.to[0].email, env.BREVO_TO_EMAIL);
    assert.equal(payload.sender.email, env.BREVO_SENDER_EMAIL);
    assert.deepEqual(payload.tags, ["integration-diagnostic"]);
    assert.match(payload.subject, /Brevo diagnostic/);
    assert.doesNotMatch(payload.textContent, /Lead ID:|Điện thoại:|Họ tên:/);
    return Response.json({ messageId: "test-123@brevo.local" }, { status: 201 });
  });
  const response = await handleBusinessIntegrations(await probeRequest(env), env);
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
  const res = await handleBusinessIntegrations(await probeRequest(env), env);
  const data = await res.json();
  assert.equal(res.status, 502);
  assert.equal(data.status, 403);
  assert.equal(data.provider_code, "permission_denied");
  assert.equal(data.accepted_by_provider, false);
  assert.ok(!JSON.stringify(data).includes("customer details"));
});

test("Brevo diagnostic rate-limits owner requests and fails closed when bindings are incomplete", async t => {
  const env = brevoTestEnv();
  env.DB.prepare = () => ({ bind() { return this; }, async first() { return 3; } });
  let sent = false;
  t.mock.method(globalThis, "fetch", async () => { sent = true; throw Error("unexpected network"); });
  const limited = await handleBusinessIntegrations(await probeRequest(env), env);
  assert.equal(limited.status, 429);
  assert.equal(sent, false);
  delete env.BREVO_API_KEY;
  const incomplete = await handleBusinessIntegrations(await probeRequest(env), env);
  assert.equal(incomplete.status, 503);
  assert.equal((await incomplete.json()).api_key_present, false);
  assert.equal(sent, false);
});


async function signedDiagnosticRequest(env, method = "GET", { timestamp, nonce, signature } = {}) {
  const ts = String(timestamp ?? Math.floor(Date.now() / 1000));
  const id = nonce ?? crypto.randomUUID();
  const message = ["ptx-brevo-diagnostic-v1", method, BREVO_DIAGNOSTIC_PATH, ts, id].join("\n");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(env.ADMIN_PASSWORD), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  const mac = signature ?? Array.from(digest, x => x.toString(16).padStart(2, "0")).join("");
  return new Request("https://phanthuanxtra.com" + BREVO_DIAGNOSTIC_PATH, {
    method,
    headers: {
      "x-ptx-brevo-timestamp": ts, "x-ptx-brevo-nonce": id, "x-ptx-brevo-signature": mac,
      "content-type": "application/json"
    },
    ...(method === "POST" ? { body: JSON.stringify({ confirm: "send-one-brevo-test-email" }) } : {})
  });
}

test("Brevo diagnostic accepts purpose-bound short-lived GitHub signature without Admin session", async t => {
  const env = brevoTestEnv();
  let outbound = 0;
  t.mock.method(globalThis, "fetch", async () => { outbound++; throw Error("unexpected outbound"); });
  const request = await signedDiagnosticRequest(env);
  const verification = await verifyBrevoDiagnosticAuth(request, env);
  assert.deepEqual(verification, { ok: true, principal: "ci", nonce: request.headers.get("x-ptx-brevo-nonce") });
  const status = await handleBusinessIntegrations(request, env);
  assert.equal(status.status, 200);
  assert.equal((await status.json()).configured, true);
  const expired = await signedDiagnosticRequest(env, "GET", { timestamp: Math.floor(Date.now() / 1000) - 180 });
  assert.equal((await verifyBrevoDiagnosticAuth(expired, env)).ok, false);
  const forged = await signedDiagnosticRequest(env, "GET", { signature: "a".repeat(64) });
  assert.equal((await verifyBrevoDiagnosticAuth(forged, env)).ok, false);
  const wrongMethod = await signedDiagnosticRequest(env, "POST", { nonce: request.headers.get("x-ptx-brevo-nonce"), timestamp: request.headers.get("x-ptx-brevo-timestamp"), signature: request.headers.get("x-ptx-brevo-signature") });
  assert.equal((await verifyBrevoDiagnosticAuth(wrongMethod, env)).ok, false);
  assert.equal(outbound, 0);
});

test("Brevo signed CI POST accepts one email and rejects a repeated nonce", async t => {
  const env = brevoTestEnv();
  const auditIds = [];
  let attempts = 0;
  env.DB.prepare = sql => {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() {
        if (sql.includes("resource_id=?")) return auditIds.includes(values[0]) ? 1 : 0;
        if (sql.includes("created_at>=datetime")) return attempts;
        throw Error("Unexpected D1: " + sql);
      },
      async run() {
        if (!sql.includes("INSERT INTO cms_audit_log")) throw Error("Unexpected D1 insert: " + sql);
        if (sql.includes("'send-attempt'")) { attempts++; auditIds.push(values[0]); }
        return { success: true };
      }
    };
  };
  let sends = 0;
  t.mock.method(globalThis, "fetch", async () => { sends++; return Response.json({messageId:"signed-ci-test@brevo.local"}, {status: 201}); });
  const signed = await signedDiagnosticRequest(env, "POST");
  const replay = signed.clone();
  const first = await handleBusinessIntegrations(signed, env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).accepted_by_provider, true);
  assert.equal(sends, 1);
  const again = await handleBusinessIntegrations(replay, env);
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error, "BREVO_TEST_REPLAY");
  assert.equal(sends, 1);
  assert.equal(attempts, 1);
});

test("Brevo diagnostic workflow uses scoped proof, not a potentially rotated D1 login credential", () => {
  const workflow = fs.readFileSync(".github/workflows/brevo-transactional-diagnostic.yml", "utf8");
  const handler = fs.readFileSync("src/business-integrations.js", "utf8");
  assert.match(workflow, /ptx-brevo-diagnostic-v1/);
  assert.match(workflow, /DIAG_METHOD/);
  assert.ok(workflow.includes(String.raw`parts.join("\n")`), "CI signature must use the same newline-delimited message as Worker");
  assert.ok(!workflow.includes(String.raw`parts.join("\\n")`), "CI signature must not sign a literal backslash-n");
  assert.doesNotMatch(workflow, /api\/admin\/login/);
  assert.doesNotMatch(workflow, /BREVO_API_KEY:/);
  assert.match(handler, /verifyBrevoDiagnosticAuth/);
  assert.match(handler, /BREVO_TEST_REPLAY/);
});


test("Brevo Worker preflight checks account without sending email or exposing account data", async t => {
  const env = brevoTestEnv();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls++;
    assert.equal(url, "https://api.brevo.com/v3/account");
    assert.equal(options.method, "GET");
    assert.equal(options.headers["api-key"], env.BREVO_API_KEY);
    return Response.json({ email: "internal-owner@invalid.example", plan: ["hidden"] }, { status: 200 });
  });
  const signed = await signedDiagnosticRequest(env, "GET");
  const request = new Request(signed.url + "?probe=account", { headers: signed.headers });
  const response = await handleBusinessIntegrations(request, env);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data, { ok: true, provider: { ok: true, status: 200 } });
  assert.equal(calls, 1);
  assert.doesNotMatch(JSON.stringify(data), /internal-owner|hidden|provider.secret/);
});

test("Brevo Worker preflight exposes only machine-readable Brevo authentication status", async t => {
  const env = brevoTestEnv();
  t.mock.method(globalThis, "fetch", async () => Response.json({
    code: "unauthorized", message: "raw account metadata and provider diagnostics must not leak"
  }, { status: 401 }));
  const signed = await signedDiagnosticRequest(env, "GET");
  const request = new Request(signed.url + "?probe=account", { headers: signed.headers });
  const response = await handleBusinessIntegrations(request, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, provider: { ok: false, status: 401, provider_code: "unauthorized" } });
});

test("Brevo Worker preflight categorizes network and runtime failures without logging secrets", async t => {
  const env = brevoTestEnv();
  let mode = 0;
  const errors = [
    new TypeError("TLS certificate failure with " + env.BREVO_API_KEY),
    new TypeError("AbortSignal.timeout is not a function: " + env.BREVO_TO_EMAIL),
    new TypeError("Failed to fetch confidential information"),
  ];
  t.mock.method(globalThis, "fetch", async () => { throw errors[mode]; });
  for (const [index, code] of ["tls_error", "request_init_error", "connection_error"].entries()) {
    mode = index;
    const signed = await signedDiagnosticRequest(env, "GET");
    const response = await handleBusinessIntegrations(new Request(signed.url + "?probe=account", { headers: signed.headers }), env);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.provider.status, 0);
    assert.equal(data.provider.provider_code, code);
    assert.equal(data.provider.exception_type, "TypeError");
    assert.ok(!JSON.stringify(data).includes(env.BREVO_API_KEY));
    assert.ok(!JSON.stringify(data).includes(env.BREVO_TO_EMAIL));
    assert.doesNotMatch(JSON.stringify(data), /confidential|certificate failure/);
  }
});

test("Brevo workflow preflights read-only account endpoint before its only email send", () => {
  const workflow = fs.readFileSync(".github/workflows/brevo-transactional-diagnostic.yml", "utf8");
  const worker = fs.readFileSync("src/business-integrations.js", "utf8");
  assert.match(worker, /probeBrevoAccount/);
  assert.match(worker, /new URL\(request\.url\)\.searchParams\.get\("probe"\) === "account"/);
  assert.match(workflow, /account preflight failed/);
  assert.match(workflow, /provider.exception_type/);
  const probe = workflow.indexOf("probe=account");
  const sender = workflow.indexOf('sign_request POST');
  assert.ok(probe >= 0 && sender > probe);
  assert.doesNotMatch(workflow, /BREVO_API_KEY:\s*\$\{\{/);
});


test("post-deploy Brevo egress checker is strictly read-only and cannot send transactional email", () => {
  const workflow = fs.readFileSync(".github/workflows/brevo-transactional-diagnostic.yml", "utf8");
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows: \["Deploy Cloudflare Worker"\]/);
  const manual = workflow.slice(workflow.indexOf("  send-one-controlled-test:"), workflow.indexOf("  read-only-egress-probe:"));
  assert.match(manual, /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  const section = workflow.slice(workflow.indexOf("  read-only-egress-probe:"));
  assert.match(section, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(section, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(section, /probe=account/);
  assert.doesNotMatch(section, /sign_request POST|method:\s*POST|curl[^\n]*-X POST|send-one-brevo-test-email/);
  assert.ok(section.includes('parts.join("\\n")'.replace("\\\\n", "\\n")));
  assert.doesNotMatch(section, /BREVO_API_KEY|api\/admin\/login/);
});


test("Brevo account probe reports same-origin redirect without following the API key", async t => {
  const env = brevoTestEnv();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls++;
    assert.equal(url, "https://api.brevo.com/v3/account");
    assert.equal(init.redirect, "manual");
    return new Response(null, { status: 302, headers: { location: "https://api.brevo.com/v3/account/?internal_session=never-expose" } });
  });
  const signed = await signedDiagnosticRequest(env);
  const res = await handleBusinessIntegrations(new Request(signed.url + "?probe=account", { headers: signed.headers }), env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.provider, {
    ok: false, status: 302, provider_code: "redirect_response",
    redirect_target: "same_origin", redirect_host: "api.brevo.com"
  });
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(data).includes("internal_session"));
  assert.ok(!JSON.stringify(data).includes(env.BREVO_API_KEY));
});

test("Brevo account probe refuses to follow cross-origin and insecure redirects", async t => {
  const env = brevoTestEnv();
  const targets = [
    ["https://other-brevo.example/sensitive?secret=must-not-leak", "different_origin", "other-brevo.example"],
    ["http://api.brevo.com/insecure", "insecure_http", "api.brevo.com"]
  ];
  let target = 0, calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response(null, { status: 307, headers: { location: targets[target][0] } });
  });
  for (target = 0; target < targets.length; target++) {
    const signed = await signedDiagnosticRequest(env);
    const res = await handleBusinessIntegrations(new Request(signed.url + "?probe=account", { headers: signed.headers }), env);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.provider.provider_code, "redirect_response");
    assert.equal(data.provider.redirect_target, targets[target][1]);
    assert.equal(data.provider.redirect_host, targets[target][2]);
    assert.ok(!JSON.stringify(data).includes("must-not-leak"));
    assert.ok(!JSON.stringify(data).includes("http://api.brevo.com/insecure"));
  }
  assert.equal(calls, targets.length);
});


test("Brevo POST preserves provider 201 when redirect mode is manual", async t => {
  const env = brevoTestEnv();
  let outbound = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    outbound++;
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(options.method, "POST");
    assert.equal(options.redirect, "manual");
    assert.equal(options.headers["api-key"], env.BREVO_API_KEY);
    return Response.json({ messageId: "approved-1@brevo.local" }, { status: 201 });
  });
  const result = await sendBrevoLeadNotification(env, {
    leadId: 123, source: "test-drive", name: "CI Brevo", phone: "0900000000"
  });
  assert.deepEqual(result, { ok: true, status: 201, message_id: "approved-1@brevo.local" });
  assert.equal(outbound, 1);
});

test("Brevo POST fails closed on cross-origin redirect without forwarding secret or resending", async t => {
  const env = brevoTestEnv();
  let outbound = 0;
  t.mock.method(globalThis, "fetch", async () => {
    outbound++;
    return new Response(null, {
      status: 307,
      headers: { location: "https://different-host.example/collect?api_key=should-never-expose" }
    });
  });
  const result = await sendBrevoLeadNotification(env, {
    leadId: 124, source: "test-drive", name: "CI Brevo", phone: "0900000000"
  });
  assert.deepEqual(result, {
    ok: false, status: 307, provider_code: "redirect_response",
    redirect_target: "different_origin", redirect_host: "different-host.example"
  });
  assert.equal(outbound, 1);
  assert.ok(!JSON.stringify(result).includes(env.BREVO_API_KEY));
  assert.doesNotMatch(JSON.stringify(result), /should-never-expose|\/collect/);
});

test("Brevo mail sender uses manual redirect mode and never automatically forwards API credentials", () => {
  const source = fs.readFileSync("src/business-integrations.js", "utf8");
  const start = source.indexOf("async function sendBrevoEmail(");
  const end = source.indexOf("export async function sendBrevoLeadNotification", start);
  const send = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(send, /redirect: "manual"/);
  assert.doesNotMatch(send, /redirect: "follow"|redirect: "error"/);
  assert.match(send, /response.status >= 300 && response.status < 400/);
  assert.match(send, /safeBrevoRedirect\(response\)/);
});
