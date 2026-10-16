import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const car=fs.readFileSync("public/car.html","utf8");
const viewer=fs.readFileSync("public/image-viewer.js","utf8");
const css=fs.readFileSync("public/image-viewer.css","utf8");
const blog=fs.readFileSync("src/blog.js","utf8");

test("every standard car page, not just tg-786, mounts shared viewer on cover and complete gallery",()=>{
  assert.match(car,/src="\/image-viewer\.js" defer/);
  assert.match(car,/href="\/image-viewer\.css"/);
  assert.match(car,/a\.setAttribute\('data-ptx-image-viewer',''\)/);
  assert.match(car,/gallery\.forEach\(\(src,i\)=>/);
  assert.match(car,/a\.href=src/);
  assert.match(car,/const gallery=imgs/);
  assert.doesNotMatch(car,/tg-786/);
  assert.doesNotMatch(car,/gallery=imgs\.filter/);
  assert.doesNotMatch(car,/DELETE FROM|UPDATE cars|PATCH\s+\/api/);
});
test("all public blog detail pages include shared viewer for full-size cover photos",()=>{
  assert.match(blog,/src="\/image-viewer\.js" defer/);
  assert.match(blog,/href="\/image-viewer\.css"/);
  assert.match(blog,/data-ptx-image-viewer/);
  assert.match(blog,/class="blog-cover"/);
});
test("viewer offers accessible modal, keyboard navigation, mobile swipe, count and no photo mutation",()=>{
  assert.match(viewer,/aria-modal/);
  assert.match(viewer,/aria-live/);
  assert.match(viewer,/ArrowLeft/);
  assert.match(viewer,/ArrowRight/);
  assert.match(viewer,/Escape/);
  assert.match(viewer,/touchstart/);
  assert.match(viewer,/touchend/);
  assert.match(viewer,/event\.preventDefault\(\)/);
  assert.match(viewer,/lastFocus\.focus\(\)/);
  assert.match(viewer,/const focusable = \[previous, next, closeButton\]/);
  assert.match(viewer,/new Set\(\)/);
  assert.match(css,/max-height:calc\(100dvh - 115px\)/);
  assert.match(css,/\[hidden\]/);
  assert.doesNotMatch(viewer,/fetch\(|delete\(|POST|PUT|\bR2\b|\bD1\b/);
});
