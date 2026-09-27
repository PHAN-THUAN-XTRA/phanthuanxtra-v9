import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("QUEUE-01 proves D1 and R2 before quota-bound Vision without weakening the gate",()=>{
  const workflow=fs.readFileSync(new URL("../.github/workflows/queue-01-e2e-origin.yml",import.meta.url),"utf8");
  assert.ok(workflow.indexOf("D1 + R2 lifecycle: PASS") < workflow.indexOf("Vehicle Vision analyze HTTP"));
  assert.match(workflow,/test "\$vision_status" = "200"/);
  assert.match(workflow,/analysis\._ai_model/);
});
