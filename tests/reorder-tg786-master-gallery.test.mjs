import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV="test";
const { PHOTO_ORDER, galleryPlan } = await import("../scripts/reorder-tg786-master-gallery.mjs");
const keys=Array.from({length:24},(_,i)=>"vehicles/telegram-"+(786+i)+"-abcdef0123456789.webp");
const urls=keys.map(k=>"https://phanthuanxtra.com/media/"+k);
const caption="🔥 HUMMER H2 LUXURY 2009\nGiá 2.600 tỷ";
const draft={inbox_id:786,status:"published",source_caption:caption,ai_json:JSON.stringify({publish_media_keys:keys})};
const makeCar=()=>({id:"tg-786",brand:"HUMMER",model:"H2 Luxury",year:2009,price:2600000000,status:"available",
  mileage:null,description:caption,cover_image:urls[0],images:urls.map((url,i)=>({id:1900+i,url,sort_order:i,is_cover:i===0?1:0}))});
test("24-photo semantic order follows MASTER model-first priority, not Telegram ingestion index",()=>{
  assert.equal(PHOTO_ORDER.length,24);
  assert.equal(new Set(PHOTO_ORDER).size,24);
  assert.equal(PHOTO_ORDER[0],22);
  assert.deepEqual(PHOTO_ORDER.slice(1,6),[1,2,5,9,6]);
  const plan=galleryPlan(makeCar(),draft);
  assert.equal(plan.cover_image,urls[21]);
  assert.equal(plan.cover_image_id,1921);
  assert.deepEqual(plan.image_ids,PHOTO_ORDER.map(n=>1899+n));
  assert.deepEqual(plan.expectedUrls,PHOTO_ORDER.map(n=>urls[n-1]));
  assert.equal(plan.alreadyOrdered,false);
  assert.equal(new Set(plan.image_ids).size,24);
});
test("already reordered canonical gallery is idempotent",()=>{
  const base=makeCar(),first=galleryPlan(base,draft);
  const car={...base,cover_image:first.cover_image,
    images:first.image_ids.map((id,index)=>({...base.images[id-1900],sort_order:index,is_cover:index===0?1:0}))};
  const second=galleryPlan(car,draft);
  assert.equal(second.alreadyOrdered,true);
  assert.deepEqual(second.image_ids,first.image_ids);
});
test("unexpected third-party reordering is not overwritten",()=>{
  const car=makeCar();
  [car.images[0],car.images[1]]=[car.images[1],car.images[0]];
  car.images.forEach((r,i)=>{r.sort_order=i;r.is_cover=i===0?1:0});
  car.cover_image=car.images[0].url;
  assert.throws(()=>galleryPlan(car,draft),/reordered since screenshot/);
});
test("fail closed when identity, album size, owner price or R2 links mismatch",()=>{
  const car=makeCar();
  assert.throws(()=>galleryPlan({...car,price:2800000000},draft),/price mismatch/);
  assert.throws(()=>galleryPlan({...car,id:"tg-787"},draft),/canonical car ID/);
  assert.throws(()=>galleryPlan({...car,images:car.images.slice(1)},draft),/unexpected image count/);
  assert.throws(()=>galleryPlan({...car,images:[...car.images.slice(0,23),{...car.images[23],id:1900}]},draft),/Duplicate image row/);
  assert.throws(()=>galleryPlan(car,{...draft,ai_json:JSON.stringify({publish_media_keys:keys.slice(0,23)})}),/24 unique/);
  assert.throws(()=>galleryPlan({...car,images:[{...car.images[0],url:"https://outside.invalid/one.webp"},...car.images.slice(1)]},draft),/do not match/);
});
