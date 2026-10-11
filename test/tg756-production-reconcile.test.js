import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ORIGINAL_INDEX_ORDER, OWNER_MILEAGE, OWNER_PRICE,
  preflightTg756, verifyTg756Production, verifyTg756Public
} from "../scripts/tg756-production-gate.mjs";

const sql=fs.readFileSync("migrations/0038_tg_756_owner_reconcile.sql","utf8");
const controller=fs.readFileSync("scripts/deploy-cloudflare-api.mjs","utf8");
const rows=Array.from({length:29},(_,i)=>({
  id:i+2001,
  url:`https://phanthuanxtra.com/media/vehicles/photo-${i}.webp`,
  sort_order:i,
  is_cover:i===0?1:0
}));
const ownerCar=()=>({
  id:"tg-756",brand:"LEXUS",model:"LM500h 2024",
  mileage:0,price:0,cover_image:rows[0].url
});
const snapshot=JSON.stringify({
  mileage:0,price:0,description:"Original copy",
  cover_image:rows[0].url,images:rows
});
function db({car=ownerCar(),images=rows,applied=false,audit=snapshot}={}){
  return async (sql,params)=>{
    if(sql.includes("FROM d1_migrations")) return [{results:applied?[{name:"0038_tg_756_owner_reconcile.sql"}]:[]}];
    if(sql.includes("FROM cars WHERE id")) return [{results:[car]}];
    if(sql.includes("FROM car_images WHERE car_id")) return [{results:images}];
    if(sql.includes("FROM cms_audit_log")) return [{results:audit==null?[]:[{summary:audit}]}];
    throw Error("Unexpected SQL "+sql);
  };
}

test("MASTER's model-first photo sequence covers each of 29 original images once",()=>{
  assert.equal(ORIGINAL_INDEX_ORDER[0],4);
  assert.equal(ORIGINAL_INDEX_ORDER.length,29);
  assert.deepEqual([...ORIGINAL_INDEX_ORDER].sort((a,b)=>a-b),Array.from({length:29},(_,i)=>i));
  const mappings=Array.from(sql.matchAll(/WHEN (\d+) THEN (\d+)/g)).map(x=>[Number(x[1]),Number(x[2])]);
  assert.deepEqual(mappings,ORIGINAL_INDEX_ORDER.map((old,sort)=>[old,sort]));
  assert.match(sql,/is_cover = CASE WHEN sort_order=4 THEN 1 ELSE 0 END/);
  assert.doesNotMatch(sql,/DELETE\s+FROM\s+(?:cars|car_images)/i);
  assert.doesNotMatch(sql,/INSERT\s+INTO\s+(?:cars|car_images)/i);
  assert.match(sql,/WHERE id='tg-756'/);
  assert.match(sql,/COUNT\(DISTINCT url\)/);
  assert.match(sql,/snapshot_before/);
});

test("D1 read-only preflight accepts 27 canonical source images and correct vehicle",async()=>{
  const p=await preflightTg756(db());
  assert.equal(p.alreadyApplied,false);
  assert.equal(p.imageCount,29);
  assert.equal(p.oldCover,rows[0].url);
  const already=await preflightTg756(db({applied:true}));
  assert.equal(already.alreadyApplied,true);
});

test("preflight refuses missing images, encoded media paths, duplicates and wrong vehicle",async()=>{
  await assert.rejects(preflightTg756(db({images:rows.slice(0,-1)})),/exactly 27/);
  await assert.rejects(preflightTg756(db({images:rows.map((x,i)=>i===3?{...x,url:x.url.replace("vehicles/","vehicles%2F")}:x)})),/noncanonical/);
  await assert.rejects(preflightTg756(db({images:rows.map((x,i)=>i===3?{...x,url:rows[0].url}:x)})),/duplicate gallery/);
  await assert.rejects(preflightTg756(db({car:{...ownerCar(),model:"LX600"}})),/vehicle model/);
});

test("post-migration gate verifies 29-image model cover, order, owner price and ODO",async()=>{
  const images=ORIGINAL_INDEX_ORDER.map((old,i)=>({...rows[old],sort_order:i,is_cover:i===0?1:0}));
  const car={...ownerCar(),mileage:OWNER_MILEAGE,price:OWNER_PRICE,cover_image:rows[4].url};
  const proof=await verifyTg756Production(db({car,images}));
  assert.equal(proof.coverImageId,rows[4].id);
  assert.equal(proof.imageCount,29);
  await assert.rejects(verifyTg756Production(db({car:{...car,price:1},images})),/wrong price/);
  await assert.rejects(verifyTg756Production(db({car:{...car,cover_image:rows[0].url},images})),/hero/);
  await assert.rejects(verifyTg756Production(db({car,images,audit:null})),/rollback snapshot/);
  const swapped=[...images];
  [swapped[1],swapped[2]]=[{...swapped[2],sort_order:1},{...swapped[1],sort_order:2}];
  await assert.rejects(verifyTg756Production(db({car,images:swapped})),/image mapping differs/);
});

test("production controller checks tg-756 before D1 mutation and after D1 migrations",()=>{
  const a=controller.indexOf("await preflightTg756(queryD1)");
  const b=controller.indexOf("await applyMigrations()");
  const c=controller.indexOf("await verifyTg756Production(queryD1)");
  const d=controller.indexOf("await uploadWorker(");
  assert.ok(a>=0 && a<b && b<c && c<d);
});

test("public D1/API gallery proof verifies the owner price and R2 model cover",async()=>{
 const ordered=ORIGINAL_INDEX_ORDER.map((index,i)=>({...rows[index],sort_order:i,is_cover:i===0?1:0}));
 const makeFetch=(price="6.799.000.000 đ")=>async(url)=>{
   if(url.includes("/api/cars")) return {status:200,async json(){return {source:"d1",cars:[{
     id:"tg-756",odo:"17.368 km",price,cover_image:ordered[0].url,images:ordered
   }]}}};
   return {status:200,headers:new Headers({"content-type":"image/webp"}),body:{async cancel(){}}};
 };
 const done=await verifyTg756Public(makeFetch());
 assert.equal(done.ok,true);
 assert.equal(done.images,29);
 await assert.rejects(verifyTg756Public(makeFetch("Liên hệ")),/public price mismatch/);
});
