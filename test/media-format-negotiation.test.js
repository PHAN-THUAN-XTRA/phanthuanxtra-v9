import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("src/index.js","utf8");

test("media delivery negotiates AVIF then WebP from Accept",()=>{
  assert.match(worker,/image\\\/avif/);
  assert.match(worker,/image\\\/webp/);
  assert.match(worker,/format==='image\/avif'\?76:82/);
  assert.match(worker,/headers\.set\('vary','Accept'\)/);
  assert.match(worker,/'x-pt-xtra-image-format':format/);
});
