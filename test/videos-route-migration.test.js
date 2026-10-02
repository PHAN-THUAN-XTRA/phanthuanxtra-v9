import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("production deploy keeps videos route migration fail-closed", () => {
  const source = fs.readFileSync(new URL("../scripts/deploy-cloudflare-api.mjs", import.meta.url), "utf8");
  assert.ok(source.includes("phanthuanxtra.com/videos*"));
  assert.ok(source.includes("expected current owner phanthuanxtra-videos"));
  assert.ok(source.includes("Videos route migration failed; legacy route owner restored"));
  assert.ok(source.includes('name: "VIDEOS_ORIGIN", type: "service", service: "phanthuanxtra-images"'));
  assert.ok(source.includes("phanthuanxtra-v2.phanthuanmodelactor.workers.dev/videos"));
  assert.ok(source.includes("await migrateVideosRoute()"));
});
