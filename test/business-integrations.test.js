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
  for (const name of ["BREVO_API_KEY","BREVO_SENDER_EMAIL","BREVO_TO_EMAIL","TAWK_PROPERTY_ID","TAWK_WIDGET_ID","ANALYTICS_EXPORT_TOKEN"]) {
    assert.ok(deploy.includes(name), "deploy controller missing " + name);
    assert.ok(workflow.includes(name), "deploy workflow missing " + name);
  }
  assert.match(sonar, /SonarSource\/sonarqube-scan-action@v8\.3\.0/);
  assert.match(sonar, /sonar\.qualitygate\.wait=true/);
  assert.match(workflow, /verify-business-integrations\.mjs/);
  assert.match(runtimeVerify, /api\/integrations\/public-config/);
  assert.match(runtimeVerify, /api\/analytics\/summary/);
  assert.match(runtimeVerify, /runtime adapter is enabled/);
});

test("Data Studio connector reads aggregate endpoint and does not request lead PII fields", () => {
  const connector = fs.readFileSync("integrations/data-studio/Code.gs", "utf8");
  assert.match(connector, /api\/analytics\/summary/);
  assert.match(connector, /ANALYTICS_EXPORT_TOKEN/);
  assert.match(connector, /function isAdminUser\(\) \{\s*return false;/);
  assert.doesNotMatch(connector, /\bphone\b|\bemail\b|\bmessage\b/i);
});
