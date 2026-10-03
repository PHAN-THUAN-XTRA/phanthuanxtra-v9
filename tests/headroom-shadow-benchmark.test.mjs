import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Headroom shadow benchmark preserves production boundaries",()=>{
 const w=fs.readFileSync(".github/workflows/headroom-shadow-benchmark.yml","utf8");
 const p=fs.readFileSync("scripts/headroom-shadow-benchmark.py","utf8");
 assert.match(w,/HEADROOM_OFFLINE: "1"/);
 assert.match(w,/HEADROOM_BEACON: "off"/);
 assert.match(w,/permissions:\n  contents: read/);
 assert.match(w,/persist-credentials: false/);
 assert.match(p,/missing_literals/);
 assert.match(p,/tokens_before/);
 assert.match(p,/tokens_after/);
 assert.doesNotMatch(w,/CLOUDFLARE_API_TOKEN|TELEGRAM_BOT_TOKEN|ADMIN_TOKEN|TYPESAFE_API_KEY|wrangler/i);
 assert.doesNotMatch(w,/contents: write|pull-requests: write/);
});
