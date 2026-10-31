import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parsePrice, normalizeCars, filterCars, monthlyPayment, safeImage} from "../public/xtra-intelligent-ui.js";

const html = fs.readFileSync(new URL("../public/trai-nghiem-xe.html", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../public/xtra-intelligent-ui.js", import.meta.url), "utf8");
const homepage = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("public advisor only uses public available vehicles and deduplicates IDs", () => {
  const cars = normalizeCars([
    {id:"tg-1",status:"available",brand:"Porsche",model:"718",price:"1.050.000.000 đ"},
    {id:"tg-2",status:"hidden",tag:"AVAILABLE",model:"Invisible",price:500000000},
    {id:"tg-3",status:"unpublished",model:"Draft",price:700000000},
    {id:"tg-4",status:"sold",model:"Sold",price:700000000},
    {id:"tg-5",tag:"AVAILABLE",model:"Legacy",price:"Liên hệ"},
    {id:"tg-1",status:"available",model:"Duplicate",price:550000000},
    {id:"unsafe?x",status:"available",model:"Invalid id"}
  ]);
  assert.deepEqual(cars.map(car=>car.id), ["tg-1","tg-5"]);
  assert.equal(cars[0].price, 1050000000);
  assert.equal(cars[1].price, null);
});

test("price parsing is VND conservative and does not invent prices", () => {
  assert.equal(parsePrice("2.500.000.000 đ"), 2500000000);
  assert.equal(parsePrice("1,050,000,000 VNĐ"), 1050000000);
  assert.equal(parsePrice(1500000000), 1500000000);
  assert.equal(parsePrice("Liên hệ"), null);
  assert.equal(parsePrice("1,5 tỷ"), null);
  assert.equal(parsePrice(""), null);
});

test("category, search, budget and unknown-price controls are consistent", () => {
  const cars = normalizeCars([
    {id:"tg-a",status:"available",name:"Q7",brand:"Audi",category:"suv",price:"1.000.000.000 đ",year:2017},
    {id:"tg-b",status:"available",name:"RX",brand:"Lexus",category:"suv",price:"2.500.000.000 đ",year:2024},
    {id:"tg-c",status:"available",name:"718",brand:"Porsche",category:"convertible",price:"Liên hệ",year:2024}
  ]);
  assert.deepEqual(filterCars(cars,{category:"suv",budget:2000000000}).map(car=>car.id),["tg-a"]);
  assert.deepEqual(filterCars(cars,{query:"pOrScHe",budget:2000000000,includeUnpriced:true}).map(car=>car.id),["tg-c"]);
  assert.equal(filterCars(cars,{budget:30000000000,includeUnpriced:false}).length,2);
});

test("amortized monthly amount responds to down payment, term and rate", () => {
  const zero = monthlyPayment(1000000000,40,60,0);
  assert.equal(zero.down,400000000);
  assert.equal(zero.principal,600000000);
  assert.equal(zero.payment,10000000);
  const base = monthlyPayment(1000000000,50,36,9);
  assert.ok(base.payment > 15000000 && base.payment < 16000000);
  assert.ok(monthlyPayment(1000000000,70,36,9).payment < base.payment);
  assert.ok(monthlyPayment(1000000000,50,60,9).payment < base.payment);
  assert.equal(monthlyPayment(1000000000,101,36,9),null);
  assert.equal(monthlyPayment(1000000000,50,0,9),null);
});

test("car photos only use approved first-party media and cannot inject an external URI", () => {
  assert.equal(safeImage("/media/vehicles/telegram-1.webp"),"https://phanthuanxtra.com/media/vehicles/telegram-1.webp");
  assert.equal(safeImage("javascript:alert(1)"),"");
  assert.equal(safeImage("https://evil.example.com/media/x.webp"),"");
  assert.equal(safeImage("//evil.example.com/media/x.webp"),"");
  assert.equal(safeImage("/api/admin/leads"),"");
});

test("page has usable inputs, disclosure, and no privileged runtime route", () => {
  for (const id of ["xtra-search","xtra-category","xtra-budget","xtra-down","xtra-term","xtra-results","xtra-finance"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html,/lãi suất.*9%\/năm/);
  assert.match(html,/type="module" src="\/xtra-intelligent-ui\.js"/);
  assert.match(js,/fetch\("\/api\/cars"/);
  assert.doesNotMatch(js,/fetch\("\/api\/(admin|lyly|leads)/);
  assert.doesNotMatch(js,/localStorage|sessionStorage|Authorization|Bearer/);
  assert.match(homepage,/href="\/trai-nghiem-xe"/);
});


test("tg-811 is rendered as the evidence-backed Phantom VII Sedan",()=>{
  const source=fs.readFileSync(new URL("../public/xtra-intelligent-ui.js",import.meta.url),"utf8");
  assert.ok(source.includes('String(car.id) === "tg-811"'));
  assert.match(source,/STANDARD WHEELBASE/);
  assert.ok(source.includes('category: String(car.id) === "tg-811"'));
  assert.doesNotMatch(source,/tg-811[^\\n]*convertible/i);
});
