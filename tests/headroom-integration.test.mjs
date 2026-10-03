import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Headroom integration stays pinned, offline, and non-mutating",()=>{
 const p=JSON.parse(fs.readFileSync("tools/headroom.json","utf8"));
 const w=fs.readFileSync(".github/workflows/headroom-isolated.yml","utf8");
 assert.match(p.commit,/^[0-9a-f]{40}$/);
 assert.equal(p.mode,"audit-only");
 for(const k of ["production_access","production_secrets","proxy","memory","telemetry","ccr_disk_cache"]) assert.equal(p[k],false);
 assert.match(w,/HEADROOM_OFFLINE: "1"/);
 assert.match(w,/HEADROOM_BEACON: "off"/);
 assert.match(w,/permissions:\n  contents: read/);
 assert.match(w,/persist-credentials: false/);
 assert.doesNotMatch(w,/headroom proxy|pip install|wrangler/i);
 assert.doesNotMatch(w,/contents: write|pull-requests: write/);
});
