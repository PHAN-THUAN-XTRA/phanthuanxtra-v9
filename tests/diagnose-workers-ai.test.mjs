import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Workers AI diagnostic targets production account and prints codes without token values",()=>{
  const source=fs.readFileSync(new URL("../scripts/diagnose-workers-ai.mjs",import.meta.url),"utf8");
  assert.match(source,/accounts\/\$\{account\}\/ai\/run/);
  assert.match(source,/error_codes/);
  assert.match(source,/CLOUDFLARE_WORKERS_AI_TOKEN/);
  assert.match(source,/response.status!==401 && response.status!==403/);
  assert.match(source,/account\?\.slice\(-8\)/);
  assert.doesNotMatch(source,/console\.log\([^\n]*(?:token|Authorization)/i);
});
