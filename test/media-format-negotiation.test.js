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


test("production publishing verifier locks canonical WebP plus adaptive AVIF/WebP",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.match(verifier,/Accept:'image\/jpeg'/);
  assert.match(verifier,/Accept:'image\/webp'/);
  assert.match(verifier,/Accept:'image\/avif,image\/webp;q=0\.8'/);
  assert.match(verifier,/x-pt-xtra-image-format/);
  assert.match(verifier,/canonical WebP \+ adaptive AVIF\/WebP delivery/);
});


test("production publishing verifier contains no escaped statement separators",()=>{
  const verifier=fs.readFileSync("scripts/verify-publishing-production.mjs","utf8");
  assert.doesNotMatch(verifier,/;\\n\s+const (?:webp|avif)=/);
});
