import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
const aiChat = fs.readFileSync(new URL("../src/ai-chat.js", import.meta.url), "utf8");
const notifier = fs.readFileSync(new URL("../src/telegram-crm-notify.js", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../.github/workflows/public-forms-ai-crm-production-e2e.yml", import.meta.url), "utf8");

test("homepage test-drive form is routed to the Telegram test-drive source", () => {
  assert.match(script, /need==="Lái thử xe"\?"test-drive"/);
  assert.match(notifier, /TEST DRIVE FORM/);
});

test("AI production smoke can verify and clean Telegram delivery", () => {
  assert.match(aiChat, /syntheticCrmProbe/);
  assert.match(aiChat, /crm_delivery/);
  assert.match(notifier, /syntheticAiChat/);
  assert.match(notifier, /cleanupDeleted/);
});

test("production gate exercises public form and AI chat routes without admin bypass", () => {
  assert.match(workflow, /Homepage public test-drive form submission: PASS/);
  assert.match(workflow, /Website AI chat -> Telegram CRM -> synthetic Telegram cleanup: PASS/);
  assert.match(workflow, /-X POST "\$SITE_URL\/api\/leads"/);
  assert.match(workflow, /-X POST "\$SITE_URL\/api\/ai-chat"/);
  assert.match(workflow, /Synthetic homepage lead cleanup: PASS/);
});
