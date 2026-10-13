// Read-only fail-closed owner hide gate: never mutate D1/R2 or publish vehicle posts.
export const MIGRATION = "0040_owner_hide_tg756_tg527.sql";
export const TARGETS = Object.freeze([
  {id:"tg-756",brand:"lexus",model:/lm\s*500h/i,imageCount:29},
  {id:"tg-527",brand:"lexus",imageCount:24},
]);
const fail = message => {throw Error("OWNER VEHICLE HIDE BLOCKED: "+message);};
const rows = response => response?.[0]?.results || [];
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
async function snapshot(queryD1,target) {
  const cars=rows(await queryD1(
    "SELECT id,brand,model,status,price,mileage,description,cover_image FROM cars WHERE id=?",
    [target.id]
  ));
  if(cars.length!==1 || cars[0].id!==target.id)fail(target.id+" canonical car missing");
  const car=cars[0];
  if(!String(car.brand||"").toLowerCase().includes(target.brand))fail(target.id+" brand identity changed");
  if(target.model && !target.model.test(String(car.model||"")))fail(target.id+" model identity changed");
  const images=rows(await queryD1(
    "SELECT id,url,sort_order,is_cover FROM car_images WHERE car_id=? ORDER BY sort_order,id",
    [target.id]
  ));
  if(images.length!==target.imageCount)fail(target.id+" gallery count changed: "+images.length);
  if(new Set(images.map(x=>x.id)).size!==images.length || new Set(images.map(x=>x.url)).size!==images.length)
    fail(target.id+" duplicate gallery rows or URLs");
  if(images.some(x=>!x.url))fail(target.id+" empty gallery URL");
  return {car,images};
}
export async function preflightOwnerHides(queryD1) {
  const markers=rows(await queryD1("SELECT name FROM d1_migrations WHERE name=?", [MIGRATION]));
  const before={};
  for(const target of TARGETS) {
    const state=await snapshot(queryD1,target);
    if(markers.length && state.car.status!=="hidden")fail(target.id+" migration already applied but publicly visible");
    before[target.id]=state;
  }
  return before;
}
export async function verifyOwnerHides(queryD1,before) {
  const results=[];
  for(const target of TARGETS) {
    const after=await snapshot(queryD1,target);
    const prior=before[target.id];
    if(after.car.status!=="hidden")fail(target.id+" status is not hidden");
    if(!same(after.images,prior.images))fail(target.id+" gallery metadata changed");
    for(const field of ["id","brand","model","price","mileage","description","cover_image"]) {
      if(after.car[field]!==prior.car[field])fail(target.id+" field changed: "+field);
    }
    results.push({id:target.id,status:"hidden",imagesPreserved:after.images.length,previousStatus:prior.car.status});
  }
  return results;
}
export async function verifyOwnerHidesPublic(fetcher,origin="https://phanthuanxtra.com") {
  const response=await fetcher(origin+"/api/cars?owner_hide_20261013="+Date.now(),{
    headers:{accept:"application/json"},cache:"no-store"
  });
  if(response.status!==200)fail("public catalog HTTP "+response.status);
  const result=await response.json();
  if(result?.source!=="d1" || !Array.isArray(result.cars))fail("public catalog not D1-backed");
  const found=result.cars.filter(x=>TARGETS.some(t=>t.id===x.id));
  if(found.length)fail("target still visible: "+found.map(x=>x.id).join(","));
  return {ok:true,source:"d1",hidden:TARGETS.map(x=>x.id)};
}
