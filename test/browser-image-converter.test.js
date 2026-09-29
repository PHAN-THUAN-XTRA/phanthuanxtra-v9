import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const admin=fs.readFileSync("src/app-admin.js","utf8");
const ui=fs.readFileSync("public/admin-control.html","utf8");
const media=fs.readFileSync("src/media.js","utf8");

test("vehicle media accepts only browser-converted AVIF/WebP and stores directly in R2",()=>{
  assert.match(admin,/image\\\/(?:avif|webp)/);
  assert.match(admin,/processing:"browser-format-only"/);
  const handler=admin.slice(admin.indexOf("async function handleVehicleMedia"),admin.indexOf("async function handleVehicleAnalyze"));
  assert.doesNotMatch(handler,/env\.IMAGES|analyzeVehicleImage|prepareVehicleWebp/);
});

test("admin converts locally before upload and never uploads the original vehicle file",()=>{
  assert.match(ui,/createImageBitmap\(file/);
  assert.match(ui,/canvasBlob\(canvas,'image\/avif',\.76\)/);
  assert.match(ui,/canvasBlob\(canvas,'image\/webp',\.82\)/);
  assert.match(ui,/uploadVehicleVariant\(variants\.avif,pair\)/);
  assert.match(ui,/uploadVehicleVariant\(variants\.webp,pair\)/);
  assert.doesNotMatch(ui,/body:file/);
  assert.match(ui,/Không gửi ảnh gốc lên server/);
});

test("media delivery prefers stored AVIF sibling and keeps WebP URL as fallback",()=>{
  assert.match(media,/key\.replace\(\/\\\.webp\$\/i,'\.avif'\)/);
  assert.match(media,/image\\\/avif/);
  assert.match(media,/avifHeaders\.set\('vary','Accept'\)/);
});
