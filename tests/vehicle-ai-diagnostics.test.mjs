import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Vehicle Vision diagnostics retain bounded sanitized provider reasons", async () => {
  const vehicle = await readFile(new URL("../src/vehicle-ai.js", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app-api.js", import.meta.url), "utf8");
  assert.match(vehicle, /reason:\s*String\(error\?\.message \|\| error\)/);
  assert.match(vehicle, /replace\(\/https\?:\\\/\\\/\\S\+\/g,\"\[url\]\"\)/);
  assert.match(vehicle, /slice\(0,240\)/);
  assert.match(app, /reason:String\(v\?\.reason\|\|\"\"\)\.slice\(0,240\)/);
  assert.match(app, /code:\"VEHICLE_AI_UNAVAILABLE\"/);
});
