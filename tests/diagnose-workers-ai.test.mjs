import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Workers AI diagnostic targets production account without exposing token values", () => {
  const source = fs.readFileSync(new URL("../scripts/diagnose-workers-ai.mjs", import.meta.url), "utf8");
  assert.match(source, /CLOUDFLARE_WORKERS_AI_TOKEN/);
  assert.match(source, /accounts\/\$\{account\}\/ai\/run/);
  assert.match(source, /response\.headers\.get\("cf-ray"\)/);
  assert.match(source, /verified\.result\?\.id/);
  assert.match(source, /account\.slice\(-8\)/);
  assert.doesNotMatch(source, /console\.log\([^\n]*\btoken\b\s*[,)]/i);
});
