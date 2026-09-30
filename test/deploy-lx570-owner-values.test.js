import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("LX570 owner-approved mileage and price are locked and production-verified", async () => {
  const migration=await readFile(new URL("../migrations/0023_lx570_owner_values.sql",import.meta.url),"utf8");
  const deploy=await readFile(new URL("../scripts/deploy-cloudflare-api.mjs",import.meta.url),"utf8");
  assert.match(migration,/inbox_id = 444/);
  assert.match(migration,/\$\.mileage', 54800/);
  assert.match(migration,/\$\.price', 4579000000/);
  assert.match(migration,/image_count'\) AS INTEGER\) = 18/);
  assert.match(deploy,/Number\(ai\.mileage\) !== 54800/);
  assert.match(deploy,/Number\(ai\.price\) !== 4579000000/);
});
