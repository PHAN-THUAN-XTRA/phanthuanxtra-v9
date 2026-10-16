import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script=fs.readFileSync("scripts/verify-tg786-live-viewer.mjs","utf8");
const workflow=fs.readFileSync(".github/workflows/verify-tg786-live-viewer.yml","utf8");
test("production browser smoke targets only public Hummer 786 page and 24-image gallery",()=>{
  assert.match(script,/car\.html\?id=tg-786/);
  assert.match(script,/\.vehicle-gallery-grid a\[data-ptx-image-viewer\]/);
  assert.match(script,/24 gallery images/);
  assert.match(script,/\.vehicle-cover-zoom/);
});
test("browser smoke exercises modal, navigation, close, and original R2 photo decoding",()=>{
  for(const name of ["ArrowRight","Escape","22 / 24","modal photo URL matches tile","naturalWidth","image bytes decode in browser"])
    assert.ok(script.includes(name),name+" acceptance required");
  assert.match(script,/width:390,height:844/);
  assert.match(script,/width:1365,height:900/);
});
test("diagnostic workflow is read only; no secret, direct database or publishing side effects",()=>{
  assert.match(workflow,/permissions:\s*\n\s*contents: read/);
  assert.match(workflow,/node scripts\/verify-tg786-live-viewer\.mjs/);
  assert.match(workflow,/upload-artifact/);
  assert.doesNotMatch(script,/POST|PUT|DELETE|ADMIN_PASSWORD|Cloudflare_API|d1\/database|db\.prepare/);
  assert.doesNotMatch(workflow,/secrets\.|wrangler deploy|publish-tg786/);
});
