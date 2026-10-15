import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const homepage = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
const script = readFileSync(new URL("../public/location-map.js", import.meta.url), "utf8");
const start = homepage.indexOf('<section class="section location-section"');
const end = homepage.indexOf("</section>", start);
const map = homepage.slice(start, end);

test("maps section is the last homepage section after contact and before footer", () => {
  assert.ok(start > homepage.indexOf('class="contact" id="contact"'));
  assert.ok(start < homepage.indexOf("</main>"));
  assert.ok(homepage.indexOf("</main>") < homepage.indexOf("<footer>"));
  assert.equal((homepage.match(/id="visit-map"/g) || []).length, 1);
  assert.ok(homepage.includes('<script src="/location-map.js" defer></script>'));
});
test("uses the owner-supplied exact Google Maps embed with accessible lazy iframe", () => {
  assert.equal((map.match(/<iframe\b/g) || []).length, 1);
  assert.match(map, /src="https:\/\/www\.google\.com\/maps\/embed\?pb=!1m18/);
  assert.match(map, /!2sPhan%20Thu%E1%BA%A7n%20Xtra/);
  assert.match(map, /width="800" height="600"/);
  assert.match(map, /title="Bản đồ Google Maps/);
  assert.match(map, /loading="lazy"/);
  assert.match(map, /referrerpolicy="strict-origin-when-cross-origin"/);
});
test("responsive sizes are present and default selection agrees with frame", () => {
  for (const size of ["compact", "standard", "wide"]) {
    assert.match(map, new RegExp('data-map-size="' + size + '"'));
    if (size !== "standard") assert.match(styles, new RegExp('location-map-frame\\[data-size="' + size + '"\\]'));
  }
  assert.match(map, /data-map-frame data-size="standard"/);
  assert.match(map, /data-map-size="standard" aria-pressed="true"/);
  assert.match(styles, /width:min\(100%,var\(--map-width\)\)/);
  assert.match(styles, /@media\(max-width:800px\)/);
});
test("size controls actually update iframe frame and accessible pressed state", () => {
  const frame = { dataset: { size: "standard" } };
  const buttons = ["compact", "standard", "wide"].map(size => ({
    dataset: { mapSize: size },
    attrs: {},
    addEventListener(type, handler) {
      assert.equal(type, "click");
      this.click = handler;
    },
    setAttribute(name, value) { this.attrs[name] = value; }
  }));
  const section = {
    querySelector(selector) { assert.equal(selector, "[data-map-frame]"); return frame; },
    querySelectorAll(selector) { assert.equal(selector, "[data-map-size]"); return buttons; }
  };
  runInNewContext(script, { document: { getElementById(id) { return id === "visit-map" ? section : null; } } });
  buttons[2].click();
  assert.equal(frame.dataset.size, "wide");
  assert.deepEqual(buttons.map(x => x.attrs["aria-pressed"]), ["false", "false", "true"]);
  buttons[0].click();
  assert.equal(frame.dataset.size, "compact");
  assert.deepEqual(buttons.map(x => x.attrs["aria-pressed"]), ["true", "false", "false"]);
});
