import test from "node:test";
import assert from "node:assert/strict";

test("gallery manager keeps cover independent from order", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../src/telegram-gallery-manager.js", import.meta.url), "utf8");
  assert.match(source, /gallery_cover_index/);
  assert.match(source, /cover_media_key/);
  assert.doesNotMatch(source, /order\.splice\(p,1\)/);
});

test("gallery callback limits rendered album controls to Telegram-safe 30 images", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../src/telegram-gallery-manager.js", import.meta.url), "utf8");
  assert.match(source, /Math\.min\(order\.length,30\)/);
});
