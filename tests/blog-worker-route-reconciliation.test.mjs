import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("production deploy reconciles shadowing Blog API Worker routes", async () => {
  const source = await readFile(new URL("../scripts/deploy-cloudflare-api.mjs", import.meta.url), "utf8");
  assert.match(source, /phanthuanxtra\.com\/api\/blog\/\*/);
  assert.match(source, /phanthuanxtra\.com\/api\/blog\/posts\/\*/);
  assert.match(source, /blogConflicts/);
  assert.match(source, /route\.pattern, script: WORKER/);
  assert.match(source, /reconciled shadowing Blog route/);
});
