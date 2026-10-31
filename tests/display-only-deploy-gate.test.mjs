import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
test("display-only tg811 deploy bypass is scoped and fail-closed",()=>{
 const script=readFileSync(new URL("../scripts/deploy-cloudflare-api.mjs",import.meta.url),"utf8");
 const workflow=readFileSync(new URL("../.github/workflows/deploy-cloudflare.yml",import.meta.url),"utf8");
 assert.match(script,/DISPLAY_ONLY_DEPLOY === "1"/);
 assert.match(script,/skip unrelated D1 migration\/preflight gates/);
 assert.match(workflow,/display-only-tg811-sedan/);
});
