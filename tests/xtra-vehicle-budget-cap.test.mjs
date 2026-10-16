import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  budgetFromPosition, MAX_VEHICLE_BUDGET, filterCars, normalizeCars
} from "../public/xtra-intelligent-ui.js";
import { homeMatches } from "../public/xtra-home-experience.js";

const home = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const detail = fs.readFileSync(new URL("../public/trai-nghiem-xe.html", import.meta.url), "utf8");
const homeModule = fs.readFileSync(new URL("../public/xtra-home-experience.js", import.meta.url), "utf8");
const advisorModule = fs.readFileSync(new URL("../public/xtra-intelligent-ui.js", import.meta.url), "utf8");

test("slider covers 500 million to Vietnam hypercar benchmark 200 billion, retaining 20 billion default", () => {
  assert.equal(MAX_VEHICLE_BUDGET, 200_000_000_000);
  assert.equal(budgetFromPosition(0), 500_000_000);
  assert.equal(budgetFromPosition(40), 20_000_000_000);
  assert.equal(budgetFromPosition(60), 30_000_000_000);
  assert.equal(budgetFromPosition(85), 100_000_000_000);
  assert.equal(budgetFromPosition(100), 200_000_000_000);
  assert.equal(budgetFromPosition(110), 200_000_000_000);
  assert.equal(budgetFromPosition(-5), 500_000_000);
  assert.equal(budgetFromPosition(NaN), 20_000_000_000);
  for (let i=1;i<=100;i++) {
    assert.ok(budgetFromPosition(i) >= budgetFromPosition(i-1), "budget slider must be nondecreasing");
  }
});

test("both public pages show 200-billion cap and preserve low-price fine controls", () => {
  assert.match(home, /id="xtra-home-budget"[^>]*min="0"[^>]*max="100"[^>]*value="40"/);
  assert.match(detail, /id="xtra-budget"[^>]*min="0"[^>]*max="100"[^>]*value="40"/);
  assert.match(home, /200 tỷ/);
  assert.match(detail, /200 tỷ/);
  assert.match(homeModule,/budgetFromPosition\(budget\.value\)/);
  assert.match(advisorModule,/budgetFromPosition\(e\.target\.value\)/);
  assert.doesNotMatch(home, /max="30000000000"/);
  assert.doesNotMatch(detail, /max="30000000000"/);
});

test("highest-value listed car is included at slider max but never invented in public inventory", () => {
  const data = [
    {id:"tg-a",status:"available",brand:"Audi",name:"Q7",year:2017,price:"1.000.000.000 đ"},
    {id:"tg-b",status:"available",brand:"Rolls-Royce",name:"Phantom",year:2026,price:"62.068.600.000 đ"},
    {id:"tg-c",status:"available",brand:"Limited",name:"Collector",year:2024,price:"200.000.000.000 đ"},
    {id:"tg-d",status:"available",brand:"Unpriced",name:"Offer only",year:2024,price:"Liên hệ"},
    {id:"tg-e",status:"hidden",brand:"Never public",name:"Unlisted",year:2024,price:"200.000.000.000 đ"}
  ];
  const cars = normalizeCars(data);
  const low = filterCars(cars,{budget:budgetFromPosition(60),includeUnpriced:true});
  assert.deepEqual(low.map(c=>c.id),["tg-a","tg-d"]);
  const max = filterCars(cars,{budget:budgetFromPosition(100),includeUnpriced:true});
  assert.equal(max.some(c=>c.id==="tg-c"),true);
  assert.equal(max.some(c=>c.id==="tg-e"),false);
  assert.equal(max.find(c=>c.id==="tg-d").price,null);
  assert.equal(homeMatches(data,"all",budgetFromPosition(100)).length,4);
});

test("unpriced cars are not misrepresented as in-budget and are clearly identified", () => {
  assert.match(advisorModule,/const priced = matches\.filter\(car=>car\.price!==null\)\.length/);
  assert.match(advisorModule,/chưa công bố giá \(tham khảo\)/);
  assert.match(homeModule,/const inBudget = matches\.filter\(car => car\.price !== null\)\.length/);
  assert.match(home,/Xe chưa công bố giá vẫn được hiển thị riêng để tham khảo/);
  assert.match(detail,/Xe chưa công bố giá \(tham khảo\)/);
});
