import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("production deploy migrates /videos route to main Worker with rollback", () => {
  const source = fs.readFileSync(new URL("../scripts/deploy-cloudflare-api.mjs", import.meta.url), "utf8");
  assert.match(source, /phanthuanxtra\.com\/videos\*/);
  assert.match(source, /expected current owner phanthuanxtra-videos/);
  assert.match(source, /Videos route migration failed; legacy route owner restored/);
  assert.match(source, /Video Review — PhanThuanXtra/);
  assert.match(source, /await migrateVideosRoute\(\)/);
});
