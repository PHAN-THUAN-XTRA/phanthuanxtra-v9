import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("production deploy verifies recovered LX570 is exactly 18 photos plus one text and a reviewable 18-image draft", async () => {
  const source = await readFile(new URL("../scripts/deploy-cloudflare-api.mjs", import.meta.url), "utf8");
  assert.match(source, /async function verifyLx570Recovery\(\)/);
  assert.match(source, /Number\(bundle\.photo_count\) !== 18/);
  assert.match(source, /Number\(bundle\.text_count\) !== 1/);
  assert.match(source, /Number\(bundle\.row_count\) !== 19/);
  assert.match(source, /Number\(ai\.image_count\) !== 18/);
  assert.match(source, /keys\.length !== 18/);
  assert.match(source, /await verifyLx570Recovery\(\);/);
});
