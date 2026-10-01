import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalVehicleCategory, inferVehicleCategory, VEHICLE_CATEGORIES } from "../src/vehicle-category.js";

test("canonical vehicle taxonomy is closed and stable",()=>{
  assert.deepEqual(VEHICLE_CATEGORIES,["suv","sedan","coupe","convertible","mpv","pickup","wagon","sport","other"]);
  assert.equal(canonicalVehicleCategory("Crossover"),"suv");
  assert.equal(canonicalVehicleCategory("CUV"),"suv");
  assert.equal(canonicalVehicleCategory("Cabriolet"),"convertible");
  assert.equal(canonicalVehicleCategory("Avant"),"wagon");
  assert.equal(canonicalVehicleCategory("made-up"),null);
});

test("premium model families fall back to the expected body category",()=>{
  assert.equal(inferVehicleCategory({brand:"LEXUS",model:"RX350L"}),"suv");
  assert.equal(inferVehicleCategory({brand:"LEXUS",model:"RX500h F SPORT PERFORMANCE"}),"suv");
  assert.equal(inferVehicleCategory({brand:"LEXUS",model:"GX 460 Luxury"}),"suv");
  assert.equal(inferVehicleCategory({brand:"LEXUS",model:"LX570"}),"suv");
  assert.equal(inferVehicleCategory({brand:"AUDI",model:"Q7 3.0 TFSI"}),"suv");
  assert.equal(inferVehicleCategory({brand:"TOYOTA",model:"Land Cruiser VX 4.6 V8"}),"suv");
  assert.equal(inferVehicleCategory({brand:"LAND ROVER",model:"Defender 110 HSE"}),"suv");
  assert.equal(inferVehicleCategory({brand:"MERCEDES",model:"S-Class"}),"sedan");
  assert.equal(inferVehicleCategory({brand:"LEXUS",model:"LM 500h"}),"mpv");
  assert.equal(inferVehicleCategory({brand:"PORSCHE",model:"911 Carrera"}),"sport");
});

test("publish boundary always normalizes category instead of trusting arbitrary AI labels",()=>{
  const ingest=fs.readFileSync("src/telegram-ingest.js","utf8");
  assert.match(ingest,/inferVehicleCategory/);
  assert.match(ingest,/category=inferVehicleCategory/);
  assert.doesNotMatch(ingest,/category:ai\.category\|\|"other"/);
});

test("homepage exposes every canonical vehicle filter",()=>{
  const html=fs.readFileSync("public/index.html","utf8");
  for(const category of VEHICLE_CATEGORIES) assert.match(html,new RegExp('data-filter="'+category+'"'));
  assert.match(html,/SUV \/ Crossover/);
});


test("homepage vehicle cards use DOM construction instead of innerHTML",()=>{
  const script=fs.readFileSync("public/script.js","utf8");
  const start=script.indexOf("function carCard");
  const end=script.indexOf("function showCompare",start);
  const block=script.slice(start,end);
  assert.match(block,/document\.createElement/);
  assert.match(block,/textContent/);
  assert.match(block,/replaceChildren/);
  assert.doesNotMatch(block,/innerHTML/);
});
