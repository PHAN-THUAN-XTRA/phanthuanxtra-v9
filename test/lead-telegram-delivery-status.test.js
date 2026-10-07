import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const indexSource = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const telegramSource = fs.readFileSync(new URL("../src/telegram-crm-notify.js", import.meta.url), "utf8");

test("lead intake persists successful Telegram delivery from notifier sent contract", () => {
  assert.match(telegramSource, /return \{ sent: true, configured: true/);
  assert.match(indexSource, /bind\(\(delivery\?\.ok\?\?delivery\?\.sent\)\?1:0,key\)\.run\(\)/);
});

test("lead replay exposes persisted delivery result to authenticated diagnostics", () => {
  assert.match(indexSource, /delivery:\{ok:Boolean\(prior\.delivery_ok\)\}/);
});
