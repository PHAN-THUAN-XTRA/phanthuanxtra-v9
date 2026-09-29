import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("QUEUE-01 proves D1 and R2 before quota-bound Vision without weakening the gate",()=>{
  const workflow=fs.readFileSync(new URL("../.github/workflows/queue-01-e2e-origin.yml",import.meta.url),"utf8");
  assert.ok(workflow.indexOf("D1 + R2 lifecycle: PASS") < workflow.indexOf("Vehicle Vision analyze HTTP"));
  assert.match(workflow,/if \[ "\$vision_status" = "200" \]; then/);
  assert.match(workflow,/analysis\._ai_model/);
  assert.match(workflow,/\.code == "VEHICLE_AI_UNAVAILABLE"/);
  assert.match(workflow,/\.code == "RATE_LIMIT"/);
  assert.match(workflow,/daily free allocation/);
  assert.match(workflow,/10,000 neurons/);
  assert.match(workflow,/Workers AI Vision: BLOCKED_BY_FREE_TIER_QUOTA/);
  assert.match(workflow,/Workers AI Vision: FAIL/);
  assert.match(workflow,/exit 1/);
});
