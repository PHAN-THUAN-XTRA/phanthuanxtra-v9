import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const index = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const hero = readFileSync(new URL("../public/hero-carousel.js", import.meta.url), "utf8");
const listing = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
function car(id, brand, name, tag = "AVAILABLE", year = 2024) {
  return { id, brand, name, tag, year, category: brand === "PORSCHE" ? "convertible" : "suv",
    cover_image: "/media/vehicles/" + id + ".webp" };
}
async function run(cars, broken = []) {
  const states = new Set();
  const badge = {hidden:true,textContent:""}, model = {hidden:true,textContent:""};
  const slide = {
    classList: {add(v){states.add(v)}, remove(v){states.delete(v)}},
    querySelector(s) {return s === "[data-catalog-brand]" ? badge : s === "[data-catalog-model]" ? model : null}
  };
  const image = {
    hidden:true,alt:"",srcValue:"",onload:null,onerror:null,
    closest(){return slide},removeAttribute(k){if(k==="src")this.srcValue=""}
  };
  Object.defineProperty(image,"src",{
    get(){return this.srcValue},
    set(src){this.srcValue=src;queueMicrotask(()=>{if(broken.includes(src))this.onerror?.();else this.onload?.()})}
  });
  const requests = [];
  runInNewContext(hero, {
    document:{querySelector(selector){return selector === '[data-catalog-hero="available-stock"]' ? image : null}},
    fetch:async (url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({source:"d1",cars})}},
    queueMicrotask,console
  });
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  return {image, badge, model, states, requests};
}
test("slide 01 retains marketing copy but does not statically show hidden Lexus",()=>{
  const start=index.indexOf('id="hero-slide-auto"');
  const html=index.slice(start,index.indexOf("</article>",start));
  assert.ok(start>0);
  assert.match(html,/data-catalog-hero="available-stock"/);
  assert.doesNotMatch(html,/RX500h|lexus-rx500h-2024/);
  assert.match(html,/01 \/ Ô TÔ CAO CẤP/);
  assert.match(html,/Trải nghiệm xe<br>theo cách riêng/);
  assert.match(html,/Đặt lịch tư vấn xe/);
  assert.match(html,/data-catalog-model/);
  assert.match(css,/#hero-slide-auto img\[hidden\]/);
});
test("Porsche 718 Boxster 2024 is preferred over another active car",async()=>{
  const x=await run([
    car("hidden-lexus","LEXUS","RX500h F SPORT PERFORMANCE","HIDDEN"),
    car("other","BMW","520i"),
    car("porsche","PORSCHE","718 BOXSTER 2024 | RACING YELLOW")
  ]);
  assert.equal(x.image.src,"/media/vehicles/porsche.webp");
  assert.equal(x.image.hidden,false);
  assert.equal(x.badge.textContent,"PORSCHE • Convertible");
  assert.equal(x.model.textContent,"718 BOXSTER 2024 | RACING YELLOW | MÂM ĐEN CỰC CHẤT");
  assert.match(x.image.alt,/PORSCHE/);
  assert.equal(x.requests[0].url,"/api/cars");
  assert.equal(x.requests[0].options.cache,"no-store");
});
test("hidden Porsche and sold Lexus are never promoted",async()=>{
  const x=await run([
    car("porsche","PORSCHE","718 BOXSTER 2024","HIDDEN"),
    car("lexus","LEXUS","RX500h","SOLD"),
    car("mercedes","MERCEDES","C300 AMG")
  ]);
  assert.equal(x.image.src,"/media/vehicles/mercedes.webp");
  assert.match(x.model.textContent,/C300 AMG/);
  assert.doesNotMatch(x.model.textContent,/BOXSTER|RX500h/);
});
test("broken preferred image falls through to next available car",async()=>{
  const x=await run([
    car("porsche","PORSCHE","718 BOXSTER 2024"),
    car("bmw","BMW","520i")
  ],["/media/vehicles/porsche.webp"]);
  assert.equal(x.image.src,"/media/vehicles/bmw.webp");
  assert.equal(x.image.hidden,false);
  assert.equal(x.badge.textContent,"BMW • SUV");
});
test("when no cars are available, show no invented stock claims",async()=>{
  const x=await run([
    car("lexus","LEXUS","RX500h","HIDDEN"),
    car("porsche","PORSCHE","718 BOXSTER 2024","SOLD")
  ]);
  assert.equal(x.image.hidden,true);
  assert.equal(x.image.src,"");
  assert.equal(x.model.hidden,true);
  assert.equal(x.badge.hidden,true);
  assert.equal(x.states.has("hero-catalog-image-unavailable"),true);
});
test("catalog cards also refuse hidden or unpublished records",()=>{
  assert.match(listing,/state\.cars=raw\.filter\(c=>!\['hidden','unpublished'\]/);
  assert.match(listing,/__ptxPublicCarsPromise=publicCatalogPromise/);
  assert.match(listing,/\$\$\('\.filter'\)\.forEach\(button=>/);
  assert.doesNotMatch(listing,/(?<!\$)\$\('\.filter'\)\.forEach/);
});
