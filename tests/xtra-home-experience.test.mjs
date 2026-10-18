import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { homeMatches } from "../public/xtra-home-experience.js";

const homepage = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../public/xtra-home-experience.js", import.meta.url), "utf8");

test("homepage embeds one XTRA advisor inside 01 / Ô TÔ before the main car grid", () => {
  const catalog = homepage.indexOf('id="cars-section"');
  const experience = homepage.indexOf('id="trai-nghiem-xe"');
  const stock = homepage.indexOf('id="cars"');
  const feng = homepage.indexOf('id="ai-assistant"');
  const booking = homepage.indexOf('id="test-drive"');
  assert.ok(catalog >= 0 && catalog < experience && experience < stock && stock < feng && feng < booking);
  assert.equal((homepage.match(/id="trai-nghiem-xe"/g) || []).length, 1);
  assert.match(homepage, /href="\/trai-nghiem-xe"/);
  assert.match(homepage.slice(catalog, feng), /TRẢI NGHIỆM XE • XTRA INTELLIGENT UI/);
  assert.match(homepage.slice(catalog, feng), /Kho xe tuyển chọn/);
  assert.match(homepage.slice(catalog, feng), /Xe đang giới thiệu/);
});

test("homepage experience has accessible working controls and live public catalog placeholders", () => {
  for (const id of ["xtra-home-title", "xtra-home-category", "xtra-home-budget", "xtra-home-budget-value", "xtra-home-cars", "xtra-home-count"]) {
    assert.match(homepage, new RegExp('id="' + id + '"'));
  }
  assert.match(homepage, /<script type="module" src="\/xtra-home-experience\.js"/);
  assert.match(homepage, /aria-live="polite"/);
  assert.match(styles, /\.xtra-home-grid\{display:grid/);
  assert.match(styles, /@media\(max-width:600px\).*?\.xtra-home-card/s);
  assert.match(styles, /#cars-section \.xtra-home-experience/);
  assert.match(homepage, /src="\/xtra-home-experience\.js\?v=20261018-unified-showroom"/);
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
  assert.match(script, /globalThis\.__ptxPublicCarsPromise/);
  assert.doesNotMatch(script, /fetch\("\/api\/cars"/);
  assert.match(script, /ptx:xtra-filters/);
  assert.match(script, /safeImage\(car\.image\)/);
  assert.match(script, /encodeURIComponent\(car\.id\)/);
  assert.doesNotMatch(script, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.doesNotMatch(script, /\/api\/(?:admin|lyly|leads)/);
  assert.doesNotMatch(script, /Bearer|ADMIN_TOKEN|LYLY_BRIDGE_TOKEN|API_KEY/);
});
