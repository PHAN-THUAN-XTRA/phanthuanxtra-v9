import test from "node:test";
import assert from "node:assert/strict";
import { issueAdminToken } from "../src/admin-auth.js";
import { handleTelegramIngest } from "../src/telegram-ingest.js";
import { setTelegramWebhook } from "../src/telegram-ingest.js";
import { handleTelegramRouter, setAutoTelegramWebhook } from "../src/telegram-router.js";
import { handleVipTelegram, setVipTelegramWebhook } from "../src/vip-telegram.js";

const webhookHandlers = [
  ["router", handleTelegramRouter, "/api/telegram/webhook", "TELEGRAM_WEBHOOK_SECRET"],
  ["ingest", handleTelegramIngest, "/api/telegram/webhook", "TELEGRAM_WEBHOOK_SECRET"],
  ["VIP", handleVipTelegram, "/api/telegram/vip-webhook", "TELEGRAM_VIP_WEBHOOK_SECRET"],
];

test("deployment secret preflight rejects missing bindings before mutations and preserves existing secrets", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../scripts/deploy-cloudflare-api.mjs", import.meta.url), "utf8"));
  const helperStart = source.indexOf("function requiredTelegramWebhookSecrets(");
  const helperEnd = source.indexOf("async function syncSecretsAndDeploy()", helperStart);
  const requiredSecrets = new Function(`${source.slice(helperStart, helperEnd)}; return requiredTelegramWebhookSecrets;`)();
  const start = source.indexOf('for (const name of requiredTelegramWebhookSecrets(publishingBindings))');
  assert.ok(start > 0 && start < source.indexOf("await applyMigrations();"));
  const end = source.indexOf('for (const name of ["IMAGES"', start);
  assert.ok(end > start);
  // Execute only the isolated local validation block, never the controller.
  const validate = new Function("process", "publishingBindings", "requiredTelegramWebhookSecrets", source.slice(start, end));
  const preflight = (process, bindings) => validate(process, bindings, values => requiredSecrets(values, process.env));
  assert.match(source.slice(helperEnd, start), /\.\.\.requiredTelegramWebhookSecrets\(currentBindings\)/);
  const names = ["TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_VIP_WEBHOOK_SECRET"];
  const bindings = names.map(name => ({ name, type: "secret_text" }));
  preflight({ env: {} }, bindings);
  preflight({ env: Object.fromEntries(names.map(name => [name, "fixture"])) }, []);
  for (const name of names) {
    assert.throws(() => preflight({ env: {} }, bindings.filter(binding => binding.name !== name)), new RegExp(name));
    assert.throws(() => preflight({ env: {} }, bindings.map(binding => binding.name === name ? { name, type: "plain_text" } : binding)), new RegExp(name));
  }
  // An unconfigured lookup bot does not impose a deployment dependency.
  assert.deepEqual(requiredSecrets(bindings, {}), names);
  assert.deepEqual(requiredSecrets(bindings, { TELEGRAM_LOOKUP_BOT_TOKEN: "" }), names);
  for (const [env, configuredBindings] of [
    [{ TELEGRAM_LOOKUP_BOT_TOKEN: "fixture" }, bindings],
    [{}, [...bindings, { name: "TELEGRAM_LOOKUP_BOT_TOKEN", type: "secret_text" }]],
  ]) {
    assert.deepEqual(requiredSecrets(configuredBindings, env), [...names, "TELEGRAM_LOOKUP_WEBHOOK_SECRET"]);
    assert.throws(() => preflight({ env }, configuredBindings), /TELEGRAM_LOOKUP_WEBHOOK_SECRET/);
    preflight({ env: { ...env, TELEGRAM_LOOKUP_WEBHOOK_SECRET: "fixture" } }, configuredBindings);
    preflight({ env }, [...configuredBindings, { name: "TELEGRAM_LOOKUP_WEBHOOK_SECRET", type: "secret_text" }]);
  }
});

for (const [name, handler, path, key] of [
  ["ingest", handleTelegramIngest, "/api/admin/telegram/webhook", "TELEGRAM_WEBHOOK_SECRET"],
  ["VIP", handleVipTelegram, "/api/admin/telegram/vip-webhook", "TELEGRAM_VIP_WEBHOOK_SECRET"],
]) {
  test(`${name} registration returns 503 for missing configuration after admin authorization`, async t => {
    const calls = [];
    t.mock.method(globalThis, "fetch", (...args) => { calls.push(args); throw new Error("Unexpected Telegram call"); });
    const e = env();
    const token = name === "ingest" ? await issueAdminToken(e) : e.ADMIN_TOKEN;
    for (const secret of [undefined, ""]) {
      for (const [bearer, status] of [["invalid", 401], [token, 503]]) {
        const response = await handler(new Request(`https://example.com${path}`, {
          method: "POST", headers: { Authorization: `Bearer ${bearer}` },
        }), { ...e, [key]: secret }, {});
        assert.equal(response.status, status);
        if (status === 503) assert.deepEqual(await response.json(), { error: "Webhook secret is not configured" });
      }
    }
    assert.equal(calls.length, 0);
  });
}

for (const [name, handler, path, key] of webhookHandlers) {
  test(`${name} webhook fails closed before processing and accepts only the Telegram header`, async t => {
    t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected network access"); });
    const DB = { prepare() { throw new Error("Unexpected database access"); } };
    const ctx = { waitUntil() { throw new Error("Unexpected queued work"); } };
    for (const secret of [undefined, "", "test-secret"]) {
      for (const headers of [{}, { "X-Telegram-Bot-Api-Secret-Token": "wrong" }, { "X-Telegram-Webhook-Secret": "test-secret" }, { "X-Telegram-Bot-Api-Secret-Token": "test-secret" }]) {
        const request = new Request(`https://example.com${path}`, { method: "POST", headers, body: "{}" });
        const accepted = secret === "test-secret" && headers["X-Telegram-Bot-Api-Secret-Token"] === secret;
        if (!accepted) request.json = () => { throw new Error("Unauthenticated body parsed"); };
        const response = await handler(request, { DB, [key]: secret }, ctx);
        assert.equal(response.status, !secret ? 503 : accepted ? 200 : 401);
        if (accepted) assert.deepEqual(await response.json(), { ok: true, ignored: true });
      }
    }
  });
}

for (const [name, setup, key, tokenKey] of [
  ["router", setAutoTelegramWebhook, "TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_AUTO_BOT_TOKEN"],
  ["ingest", setTelegramWebhook, "TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_BOT_TOKEN"],
  ["VIP", setVipTelegramWebhook, "TELEGRAM_VIP_WEBHOOK_SECRET", "TELEGRAM_VIP_BOT_TOKEN"],
]) {
  test(`${name} registration requires and sends secret_token`, async t => {
    const calls = [];
    t.mock.method(globalThis, "fetch", async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ ok: true, result: true }));
    });
    for (const secret of [undefined, ""]) {
      await assert.rejects(setup({ [key]: secret, [tokenKey]: "fixture" }, "https://example.com/webhook"), /WEBHOOK_SECRET is not configured/);
    }
    assert.equal(calls.length, 0);
    await setup({ [key]: "test-secret", [tokenKey]: "fixture" }, "https://example.com/webhook");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].secret_token, "test-secret");
  });
}

function env(){
  return {
    ["ADMIN_"+"TOKEN"]:"unit-fixture-signing-value",
    ["TELEGRAM_BOT_"+"TOKEN"]:"unit-fixture-bot-value"
  };
}

test("Telegram webhook status accepts the signed Admin session and exposes only safe bot identity", async () => {
  const e=env();
  const token=await issueAdminToken(e);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async url => {
    const method=String(url).split("/").pop();
    const result=method==="getMe"
      ? {id:123456,is_bot:true,first_name:"PT Xtra",username:"ptx_test_bot"}
      : {url:"https://phanthuanxtra.com/api/telegram/webhook",pending_update_count:0};
    return new Response(JSON.stringify({ok:true,result}),{status:200,headers:{"content-type":"application/json"}});
  };
  try{
    const request=new Request("https://phanthuanxtra.com/api/admin/telegram/webhook-status",{
      headers:{Authorization:`Bearer ${token}`}
    });
    const response=await handleTelegramIngest(request,e,{});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.url_matches_expected,true);
    assert.deepEqual(body.bot,{id:123456,username:"ptx_test_bot",name:"PT Xtra",is_bot:true});
    assert.equal(JSON.stringify(body).includes(e["TELEGRAM_BOT_"+"TOKEN"]),false);
  } finally {
    globalThis.fetch=originalFetch;
  }
});

test("Telegram webhook admin routes reject an invalid bearer token", async () => {
  const response=await handleTelegramIngest(new Request("https://phanthuanxtra.com/api/admin/telegram/webhook-status",{
    headers:{Authorization:"Bearer invalid"}
  }),env(),{});
  assert.equal(response.status,401);
});
