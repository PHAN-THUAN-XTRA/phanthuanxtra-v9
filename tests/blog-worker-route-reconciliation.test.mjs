import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("production deploy binds Blog domain paths explicitly without changing other routes", () => {
  const source=fs.readFileSync(new URL("../scripts/deploy-cloudflare-api.mjs",import.meta.url),"utf8");
  assert.match(source,/"phanthuanxtra.com\/api\/blog\/\*"/);
  assert.match(source,/"phanthuanxtra.com\/blog\/\*"/);
  assert.match(source,/"phanthuanxtra.com\/blog"/);
  assert.match(source,/route\?\.script === WORKER/);
  assert.match(source,/Blog custom-domain route failed: HTTP/);
  assert.match(source,/Worker custom-domain owners:/);
});
