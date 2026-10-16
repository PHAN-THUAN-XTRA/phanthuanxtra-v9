import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { homeMatches } from "../public/xtra-home-experience.js";

const homepage = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../public/xtra-home-experience.js", import.meta.url), "utf8");

test("homepage has one car experience immediately after private appointment and before contact", () => {
  const booking = homepage.indexOf('<section class="section test-drive" id="test-drive">');
  const experience = homepage.indexOf('<section class="section xtra-home-experience" id="trai-nghiem-xe"');
  const contact = homepage.indexOf('<section class="contact" id="contact">');
  assert.ok(booking > 0 && experience > booking && contact > experience);
  assert.equal(homepage.slice(booking, experience).split("</section>").length - 1, 1);
  assert.equal((homepage.match(/id="trai-nghiem-xe"/g) || []).length, 1);
  assert.match(homepage, /href="\/trai-nghiem-xe"/);
  assert.doesNotMatch(homepage.slice(0, booking), /Tư vấn xe tương tác ↗/);
});

test("homepage experience has accessible working controls and live public catalog placeholders", () => {
  for (const id of ["xtra-home-title", "xtra-home-category", "xtra-home-budget", "xtra-home-budget-value", "xtra-home-cars", "xtra-home-count"]) {
    assert.match(homepage, new RegExp('id="' + id + '"'));
  }
  assert.match(homepage, /<script type="module" src="\/xtra-home-experience\.js"/);
  assert.match(homepage, /aria-live="polite"/);
  assert.match(styles, /\.xtra-home-grid\{display:grid/);
  assert.match(styles, /@media\(max-width:600px\).*?\.xtra-home-card/s);
});

test("home experience filters only public stock, respects budget, and segregates unknown prices", () => {
  const stock = [
    {id:"tg-1",status:"available",category:"suv",brand:"Audi",name:"Q7",year:2017,price:"1.000.000.000 đ"},
    {id:"tg-2",status:"available",category:"suv",brand:"Lexus",name:"RX",year:2024,price:"2.500.000.000 đ"},
    {id:"tg-3",status:"hidden",category:"suv",brand:"Porsche",name:"Hidden",price:"500.000.000 đ"},
    {id:"tg-4",status:"unpublished",category:"sedan",name:"Draft",price:"1.000.000.000 đ"},
    {id:"tg-5",status:"available",category:"coupe",brand:"Porsche",name:"718",price:"Liên hệ"}
  ];
  assert.deepEqual(homeMatches(stock, "suv", 2000000000).map(car => car.id), ["tg-1"]);
  assert.deepEqual(homeMatches(stock, "all", 2000000000).map(car => car.id), ["tg-1", "tg-5"]);
  assert.deepEqual(homeMatches(stock, "coupe", 2000000000).map(car => car.id), ["tg-5"]);
  assert.equal(homeMatches(stock, "all", 30000000000).length, 3);
});

test("homepage only reads public catalog without changing backend or exposing credentials", () => {
  assert.match(script, /fetch\("\/api\/cars", \{ cache: "no-store", credentials: "same-origin" \}\)/);
  assert.match(script, /safeImage\(car\.image\)/);
  assert.match(script, /encodeURIComponent\(car\.id\)/);
  assert.doesNotMatch(script, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.doesNotMatch(script, /\/api\/(?:admin|lyly|leads)/);
  assert.doesNotMatch(script, /Bearer|ADMIN_TOKEN|LYLY_BRIDGE_TOKEN|API_KEY/);
});
