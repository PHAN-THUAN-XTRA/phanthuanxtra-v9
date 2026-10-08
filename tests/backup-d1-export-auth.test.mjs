import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/full-system-backup.mjs", import.meta.url), "utf8");

test("D1 native export authorization failures have actionable diagnostics", () => {
  assert.match(source, /isExport&&\[401,403\]\.includes\(attempt\.status\)/);
  assert.match(source, /D1 SELECT\/read preflight does not prove native export permission/);
  assert.match(source, /production backup secret securely/);
});
