import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {preflightOwnerHides,verifyOwnerHides,verifyOwnerHidesPublic,TARGETS} from "../scripts/owner-hide-tg756-tg527-gate.mjs";

const migration=readFileSync(new URL("../migrations/0040_owner_hide_tg756_tg527.sql",import.meta.url),"utf8");
const controller=readFileSync(new URL("../scripts/deploy-cloudflare-api.mjs",import.meta.url),"utf8");
const cars=[
  {id:"tg-756",brand:"LEXUS",model:"LM 500h",status:"available",price:6799000000,mileage:17368,description:"preserved",cover_image:"cover756"},
  {id:"tg-527",brand:"LEXUS",model:"LX 570",status:"sold",price:4580000000,mileage:12000,description:"preserved",cover_image:"cover527"},
];
const photos=Object.fromEntries(TARGETS.map(t=>[t.id,Array.from({length:t.imageCount},(_,i)=>({id:t.id==="tg-756"?2000+i:3000+i,url:"https://phanthuanxtra.com/media/vehicles/"+t.id+"-"+i+".webp",sort_order:i,is_cover:i===0?1:0}))]));
function fakeQuery(carRows=cars,imageRows=photos,applied=false) {
  return async (sql,args=[])=>{
    if(sql.includes("FROM d1_migrations"))return [{results:applied?[{name:"0040_owner_hide_tg756_tg527.sql"}]:[]}];
    if(sql.includes("FROM cars WHERE id=?"))return [{results:carRows.filter(x=>x.id===args[0])}];
    if(sql.includes("FROM car_images WHERE car_id=?"))return [{results:imageRows[args[0]]||[]}];
    throw Error("unexpected SQL: "+sql);
  };
}
test("migration hides exactly two approved cars, records previous statuses and never touches galleries",()=>{
  assert.match(migration,/UPDATE cars SET status='hidden'/);
  assert.match(migration,/previous_status=/);
  for(const t of TARGETS)assert.ok(migration.includes(t.id));
  assert.doesNotMatch(migration,/DELETE\s+FROM|UPDATE\s+car_images|INSERT\s+INTO\s+(?:cars|car_images)/i);
  assert.match(migration,/COUNT\(\*\) FROM car_images/);
});
test("preflight fails closed on identity, missing cars/gallery, and reused migration state",async()=>{
  const before=await preflightOwnerHides(fakeQuery());
  assert.equal(before["tg-756"].images.length,29);
  assert.equal(before["tg-527"].images.length,24);
  await assert.rejects(preflightOwnerHides(fakeQuery(cars.slice(1))),/canonical car missing/);
  await assert.rejects(preflightOwnerHides(fakeQuery([{...cars[0],model:"Lexus RX"},cars[1]])),/model identity changed/);
  await assert.rejects(preflightOwnerHides(fakeQuery(cars,{"tg-756":[],"tg-527":photos["tg-527"]})),/gallery count changed/);
  await assert.rejects(preflightOwnerHides(fakeQuery(cars,photos,true)),/already applied/);
  const alreadyHidden=await preflightOwnerHides(fakeQuery(cars.map(x=>({...x,status:"hidden"})),photos,true));
  assert.equal(alreadyHidden["tg-527"].car.status,"hidden");
});
test("postmigration proof preserves all non-status car fields and gallery IDs URLs order cover",async()=>{
  const before=await preflightOwnerHides(fakeQuery());
  const after=cars.map(x=>({...x,status:"hidden"}));
  const out=await verifyOwnerHides(fakeQuery(after),before);
  assert.deepEqual(out.map(x=>x.id),["tg-756","tg-527"]);
  assert.deepEqual(out.map(x=>x.imagesPreserved),[29,24]);
  await assert.rejects(verifyOwnerHides(fakeQuery(cars),before),/status is not hidden/);
  await assert.rejects(verifyOwnerHides(fakeQuery(after,{"tg-756":photos["tg-756"].slice(1),"tg-527":photos["tg-527"]}),before),/gallery count changed/);
  await assert.rejects(verifyOwnerHides(fakeQuery([{...after[0],price:1},after[1]]),before),/field changed: price/);
});
test("public verification rejects static fallback and either leaked car",async()=>{
  const mock=body=>async()=>({status:200,json:async()=>body});
  const proof=await verifyOwnerHidesPublic(mock({source:"d1",cars:[{id:"tg-652"}]}));
  assert.deepEqual(proof.hidden,["tg-756","tg-527"]);
  await assert.rejects(verifyOwnerHidesPublic(mock({source:"static",cars:[]})),/not D1-backed/);
  for(const t of TARGETS)
    await assert.rejects(verifyOwnerHidesPublic(mock({source:"d1",cars:[{id:t.id}]})),/still visible/);
});
test("deploy takes D1 snapshots before migration, verifies after and checks public after Worker upload",()=>{
  const a=controller.indexOf("await preflightOwnerHides(queryD1)");
  const b=controller.indexOf("await applyMigrations()");
  const c=controller.indexOf("await verifyOwnerHides(queryD1,ownerHidesBefore)");
  const d=controller.indexOf("await uploadWorker(");
  const e=controller.indexOf("await verifyOwnerHidesPublic(fetch)");
  assert.ok(a>=0&&a<b&&b<c&&c<d&&d<e);
  assert.doesNotMatch(controller,/await verifyTg756Public\(fetch\)/);
});
