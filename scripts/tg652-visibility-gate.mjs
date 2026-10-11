// Read-only deployment gate for the owner-approved repeat hide of tg-652.
// Do not delete D1 rows, R2 media, or post another Telegram vehicle.
export const CAR_ID="tg-652";
export const MIGRATION_NAME="0039_tg_652_owner_hide.sql";
function assertSafe(value,msg){if(!value)throw Error("tg-652 HIDE BLOCKED: "+msg);}
const rows = value => value?.[0]?.results || [];
function checkIdentity(car){
  assertSafe(car?.id===CAR_ID,"vehicle record missing");
  assertSafe(/audi/i.test(String(car.brand)) && /q7/i.test(String(car.model)),"vehicle identity changed");
}
async function readState(queryD1) {
  const carRows=rows(await queryD1(
    "SELECT id,brand,model,status,price,mileage,description,cover_image FROM cars WHERE id=?", [CAR_ID]
  ));
  assertSafe(carRows.length===1,"canonical car count is not one");
  const car=carRows[0];checkIdentity(car);
  const images=rows(await queryD1(
    "SELECT id,url,sort_order,is_cover FROM car_images WHERE car_id=? ORDER BY sort_order,id",[CAR_ID]
  ));
  assertSafe(images.length>0,"vehicle has no preserved gallery images");
  assertSafe(new Set(images.map(x=>Number(x.id))).size===images.length,"duplicate image identifiers");
  return {car,images};
}
export async function preflightTg652(queryD1){
  const migration=rows(await queryD1("SELECT name FROM d1_migrations WHERE name=?", [MIGRATION_NAME]));
  const state=await readState(queryD1);
  assertSafe(!migration.length || state.car.status==="hidden","migration is marked applied but vehicle is visible");
  return {alreadyApplied:migration.length>0,...state};
}
export async function verifyTg652Hidden(queryD1,before) {
  const state=await readState(queryD1);
  assertSafe(state.car.status==="hidden","vehicle status is not hidden");
  assertSafe(before.images.length===state.images.length,"image count changed during hide");
  for(let i=0;i<state.images.length;i++){
    const a=before.images[i],b=state.images[i];
    assertSafe(a.id===b.id && a.url===b.url &&
      Number(a.sort_order)===Number(b.sort_order) &&
      Number(a.is_cover)===Number(b.is_cover),"image metadata changed while hiding");
  }
  for(const key of ["id","brand","model","price","mileage","description","cover_image"]){
    assertSafe(before.car[key]===state.car[key],"car metadata changed while hiding: "+key);
  }
  return {ok:true,id:CAR_ID,status:"hidden",imagesPreserved:state.images.length,previousStatus:before.car.status};
}
export async function verifyTg652Public(fetcher,origin="https://phanthuanxtra.com"){
  const response=await fetcher(origin+"/api/cars?tg652_hide_verify="+Date.now(),{
    headers:{accept:"application/json"},cache:"no-store"
  });
  assertSafe(response.status===200,"public catalog HTTP "+response.status);
  const catalog=await response.json();
  assertSafe(catalog?.source==="d1","public catalog is not D1-backed");
  assertSafe(Array.isArray(catalog.cars),"public catalog is invalid");
  assertSafe(!catalog.cars.some(item=>item.id===CAR_ID),"vehicle still visible in public catalog");
  return {ok:true,id:CAR_ID,publicStatus:"hidden",source:"d1"};
}
