import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("marketing ops ports upstream concepts without importing its runtime",()=>{
  const api=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
  const ui=fs.readFileSync(new URL("../public/admin-control.html",import.meta.url),"utf8");
  const pkg=JSON.parse(fs.readFileSync(new URL("../package.json",import.meta.url),"utf8"));
  assert.match(api,/\/api\/admin\/marketing/);
  assert.match(api,/xtra_customer_care/);
  assert.match(api,/xtra_customer_care_proposals/);
  assert.match(ui,/Marketing Operations/);
  assert.match(ui,/Weekly Tool Radar/);
  assert.match(ui,/github\.com\/trending\?since=weekly/);
  assert.match(ui,/Không tự cài/);
  assert.equal(pkg.dependencies?.next,undefined);
  assert.equal(pkg.dependencies?.["better-sqlite3"],undefined);
  assert.doesNotMatch(api,/OpenClaw CLI/);
});
