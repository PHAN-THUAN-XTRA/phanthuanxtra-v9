// One-time owner requested gallery reordering for tg-786 under MASTER_PROJECT_STATUS.md.
// Existing image IDs and R2 media remain untouched; only order + cover via CMS endpoint.
// 1-based references correspond to 3-column x 8-row screenshot of original 24 images.
export const PHOTO_ORDER = Object.freeze([
  22,                  // person with HUMMER: owner-accepted cover priority
  1,2,5,9,6,           // exterior: front 3/4 -> front -> profile -> rear 3/4 -> rear
  18,                 // roof detail
  10,23,11,21,        // door/cockpit transition, dashboard
  12,8,3,14,19,20,4,15, // front and rear seating progression (keep all 24)
  16,7,               // rear console and door trim
  13,17,              // cargo: cabin -> open tailgate
  24                  // remaining instrument cluster detail
]);
const CAR_ID="tg-786", INBOX_ID=786, SITE="https://phanthuanxtra.com";
const DB_ID="8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d";
function requireTrue(v,message){if(!v)throw new Error(message);}
function expectedUrls(draft){
  requireTrue(Number(draft?.inbox_id)===INBOX_ID,"Draft Inbox mismatch");
  const content=String(draft?.source_caption||"");
  requireTrue(/HUMMER\s+H2\s+LUXURY\s+2009/i.test(content),"Wrong owner draft identity");
  const ai=JSON.parse(draft.ai_json||"{}");
  const keys=ai.publish_media_keys;
  requireTrue(Array.isArray(keys)&&keys.length===24&&new Set(keys).size===24,"Draft must have exactly 24 unique images");
  requireTrue(keys.every(k=>typeof k==="string"&&/^vehicles\/[A-Za-z0-9._/-]+\.webp$/.test(k)&&!k.includes("..")),"Untrusted R2 media key");
  return keys.map(key=>SITE+"/media/"+key.split("/").map(encodeURIComponent).join("/"));
}
function checkVehicleIdentity(car){
  requireTrue(car?.id===CAR_ID,"Wrong canonical car ID");
  requireTrue(String(car.brand).toUpperCase()==="HUMMER" && /^H2\s+Luxury$/i.test(String(car.model)),"Wrong vehicle identity");
  requireTrue(Number(car.year)===2009 && Number(car.price)===2600000000,"Owner year/price mismatch");
  requireTrue(car.status==="available","Car is not publicly available");
}
export function galleryPlan(car,draft){
  checkVehicleIdentity(car);
  requireTrue(PHOTO_ORDER.length===24&&new Set(PHOTO_ORDER).size===24&&PHOTO_ORDER.every(i=>Number.isInteger(i)&&i>=1&&i<=24),"Invalid semantic 24-photo order");
  const sourceUrls=expectedUrls(draft);
  const images=car.images;
  requireTrue(Array.isArray(images)&&images.length===24,"Public car has unexpected image count");
  requireTrue(images.every((r,i)=>Number.isInteger(Number(r.id))&&Number(r.id)>0&&r.sort_order===i),"Current D1 sort order is not contiguous");
  requireTrue(new Set(images.map(r=>Number(r.id))).size===24,"Duplicate image row ID");
  const indexed=new Map(images.map(r=>[r.url,r]));
  requireTrue(indexed.size===24&&sourceUrls.every(url=>indexed.has(url)),"Draft and gallery media do not match exactly");
  const desired=PHOTO_ORDER.map(index=>indexed.get(sourceUrls[index-1]));
  const orderedIds=desired.map(r=>Number(r.id));
  const cover=desired[0];
  const currentIds=images.map(r=>Number(r.id));
  const alreadyOrdered=currentIds.every((id,i)=>id===orderedIds[i]) &&
    String(car.cover_image)===cover.url &&
    images.every((r,i)=>Number(r.is_cover)===(i===0?1:0));
  if(!alreadyOrdered){
    // Only reorder the exact original screenshot album, never overwrite a later owner edit.
    requireTrue(images.every((r,i)=>r.url===sourceUrls[i]),"Current album was reordered since screenshot; manual review required");
    requireTrue(String(car.cover_image)===sourceUrls[0]&&Number(images[0].is_cover)===1,"Original cover changed since screenshot");
  }
  return {id:CAR_ID,image_ids:orderedIds,cover_image_id:Number(cover.id),cover_image:cover.url,
    expectedUrls:PHOTO_ORDER.map(index=>sourceUrls[index-1]),alreadyOrdered,
    before_ids:currentIds, originalPhotoOrder:[...PHOTO_ORDER]};
}
async function getJson(url,options={}){
  const res=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});
  const raw=await res.text();
  let data;try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,160)}}
  return {status:res.status,data};
}
async function queryDraft(){
  const account=process.env.CLOUDFLARE_ACCOUNT_ID||"";
  requireTrue(/^[a-fA-F0-9]{32}$/.test(account),"Cloudflare account missing");
  const tokens=[process.env.CLOUDFLARE_API_TOKEN,process.env.CLOUDFLARE_BACKUP_API_TOKEN].filter(Boolean);
  requireTrue(tokens.length,"Cloudflare D1 token missing");
  const url="https://api.cloudflare.com/client/v4/accounts/"+account+"/d1/database/"+DB_ID+"/query";
  for(const token of tokens){
    try {
      const answer=await getJson(url,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
        body:JSON.stringify({sql:"SELECT inbox_id,status,ai_json,source_caption FROM vehicle_ai_drafts WHERE inbox_id=? LIMIT 1",params:[INBOX_ID]})});
      if(answer.status===200&&answer.data.success===true){
        const row=answer.data.result?.[0]?.results?.[0];
        requireTrue(row && ["published","previewed"].includes(row.status),"Owner draft not ready");
        return row;
      }
    }catch(e){console.warn("Read-only D1 query retry:",String(e.message||e).slice(0,100));}
  }
  throw Error("Could not verify original R2 album from production D1");
}
async function adminSession(){
  requireTrue(process.env.ADMIN_PASSWORD,"Production admin password missing");
  const response=await getJson(SITE+"/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:process.env.ADMIN_PASSWORD})});
  requireTrue(response.status===200&&response.data.ok===true&&response.data.token,"Admin login failed (HTTP "+response.status+")");
  return {authorization:"Bearer "+response.data.token};
}
async function getAdminCar(headers){
  const reply=await getJson(SITE+"/api/admin/cars/"+CAR_ID,{headers});
  requireTrue(reply.status===200 && reply.data.car,"Canonical car missing in Admin");
  return reply.data.car;
}
function assertFinalGallery(car,plan){
  checkVehicleIdentity(car);
  requireTrue(car.images?.length===24,"Gallery lost images");
  requireTrue(car.images.every((row,i)=>row.url===plan.expectedUrls[i]&&Number(row.sort_order)===i&&Number(row.is_cover)===(i===0?1:0)),"Gallery order/cover flags not persisted");
  requireTrue(car.cover_image===plan.cover_image,"Cover not persisted");
}
async function main(){
  requireTrue(process.env.GITHUB_REF==="refs/heads/main","Production only from merged main");
  const draft=await queryDraft();
  const headers=await adminSession();
  const before=await getAdminCar(headers);
  const plan=galleryPlan(before,draft);
  console.log("[tg-786] preflight: 24/24 original images, 1 canonical vehicle, price 2600000000");
  console.log("[tg-786] semantic source-photo order:",plan.originalPhotoOrder.join(","));
  console.log("[tg-786] cover: original screenshot photo #22, D1 car_image id:",plan.cover_image_id);
  if(!plan.alreadyOrdered){
    const update=await getJson(SITE+"/api/admin/cars/"+CAR_ID+"/images/order",{
      method:"PUT",headers:{...headers,"content-type":"application/json; charset=utf-8","X-PTX-Actor":"master-gallery-tg786"},
      body:JSON.stringify({image_ids:plan.image_ids,cover_image_id:plan.cover_image_id})});
    requireTrue(update.status===200&&update.data.ok===true,"CMS gallery reorder failed: HTTP "+update.status+" "+JSON.stringify(update.data).slice(0,300));
  }else console.log("[tg-786] already in approved semantic order, no writes");
  const after=await getAdminCar(headers);
  assertFinalGallery(after,plan);
  // Owner-commercial and description fields must not change when only ordering photos.
  for(const key of ["price","mileage","description","brand","model","year","status","features_json","color","category"]){
    requireTrue(String(before[key]??"")===String(after[key]??""),"Unexpected owner field mutation: "+key);
  }
  const pub=await getJson(SITE+"/api/cars?verify_hummer_gallery="+Date.now());
  requireTrue(pub.status===200 && Array.isArray(pub.data.cars),"Public API unavailable");
  const results=pub.data.cars.filter(c=>c.id===CAR_ID);
  requireTrue(results.length===1,"Canonical car not unique in public catalog");
  const item=results[0];
  requireTrue(item.cover_image===plan.cover_image,"Public cover mismatch");
  requireTrue(Array.isArray(item.images)&&item.images.length===24,"Public gallery size mismatch");
  requireTrue(item.images.every((img,i)=>(typeof img==="string"?img:img.url)===plan.expectedUrls[i]),"Public gallery sequence mismatch");
  console.log("[tg-786] VERIFIED: cover=person/photo #22; gallery 24/24; order 0..23; owner price/ODO/copy intact");
  console.log("[tg-786] SUCCESS "+SITE+"/car?id="+CAR_ID);
}
if(process.env.NODE_ENV!=="test")main().catch(error=>{console.error("[tg-786] FAILED:",String(error.message||error));process.exitCode=1});
