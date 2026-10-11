import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {preflightTg652,verifyTg652Hidden,verifyTg652Public} from "../scripts/tg652-visibility-gate.mjs";

const sql=fs.readFileSync("migrations/0039_tg_652_owner_hide.sql","utf8");
const controller=fs.readFileSync("scripts/deploy-cloudflare-api.mjs","utf8");
const original={id:"tg-652",brand:"AUDI",model:"Q7 3.0 TFSI",status:"sold",price:1050000000,mileage:0,description:"Owner description",cover_image:"https://example.com/q7.webp"};
const photos=Array.from({length:23},(_,i)=>({id:3000+i,url:`https://example.com/q7-${i}.webp`,sort_order:i,is_cover:i===0?1:0}));
const makeDb=(car=original,images=photos,applied=false)=>async sql=>{
 if(sql.includes("FROM d1_migrations"))return [{results:applied?[{name:"0039_tg_652_owner_hide.sql"}]:[]}];
 if(sql.includes("FROM cars WHERE id"))return [{results:car?[car]:[]}];
 if(sql.includes("FROM car_images"))return [{results:images}];
 throw Error("unexpected query "+sql);
};

test("one-time hide migration updates only status and audit, never deletes images",()=>{
 assert.match(sql,/UPDATE cars\s+SET status='hidden'/i);
 assert.match(sql,/previous_status=/);
 assert.match(sql,/WHERE id='tg-652' AND status <> 'hidden'/);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+(?:car_images|cars)/i);
 assert.doesNotMatch(sql,/UPDATE\s+car_images/i);
 assert.doesNotMatch(sql,/INSERT\s+INTO\s+(?:cars|car_images)/i);
});
test("read-only source preflight identifies existing Audi Q7 and preserves gallery",async()=>{
 const p=await preflightTg652(makeDb());
 assert.equal(p.car.status,"sold");assert.equal(p.images.length,23);
 const hidden=await preflightTg652(makeDb({...original,status:"hidden"},photos,true));
 assert.equal(hidden.alreadyApplied,true);
 await assert.rejects(preflightTg652(makeDb({...original,model:"LX570"})),/identity changed/);
 await assert.rejects(preflightTg652(makeDb(original,[])),/no preserved gallery/);
 await assert.rejects(preflightTg652(makeDb(original,photos,true)),/marked applied/);
});
test("post-hide proof preserves price, cover, 23 photos and all unchanged metadata",async()=>{
 const before=await preflightTg652(makeDb());
 const result=await verifyTg652Hidden(makeDb({...original,status:"hidden"}),before);
 assert.equal(result.status,"hidden");assert.equal(result.imagesPreserved,23);
 await assert.rejects(verifyTg652Hidden(makeDb(original),before),/not hidden/);
 await assert.rejects(verifyTg652Hidden(makeDb({...original,status:"hidden"},photos.slice(1)),before),/image count changed/);
 await assert.rejects(verifyTg652Hidden(makeDb({...original,status:"hidden",price:2}),before),/metadata changed/);
});
test("public catalog hides tg-652 without removing other cars",async()=>{
 const fetcher=async()=>({status:200,async json(){return {source:"d1",cars:[{id:"tg-756"}]}}});
 assert.equal((await verifyTg652Public(fetcher)).publicStatus,"hidden");
 await assert.rejects(verifyTg652Public(async()=>({status:200,async json(){return {source:"d1",cars:[{id:"tg-652"}]}}})),/still visible/);
 await assert.rejects(verifyTg652Public(async()=>({status:200,async json(){return {source:"static",cars:[]}}})),/not D1-backed/);
});
test("deploy controller gates tg-652 D1 mutation and verifies before public check",()=>{
 const a=controller.indexOf("await preflightTg652(queryD1)");
 const b=controller.indexOf("await applyMigrations()");
 const c=controller.indexOf("await verifyTg652Hidden(queryD1, tg652Before)");
 const d=controller.indexOf("await uploadWorker(");
 const e=controller.indexOf("await verifyTg652Public(fetch)");
 assert.ok(a>=0 && a<b && b<c && c<d && d<e);
});
