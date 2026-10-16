import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";
const { recoverOwnerVehicle } = await import("../scripts/publish-tg786-production.mjs");

const caption = "🔥 HUMMER H2 LUXURY 2009 – BIỂU TƯỢNG SỨC MẠNH VÀ ĐẲNG CẤP MỸ!\nGiá 2.600 tỷ";
const keys = Array.from({length:24},(_,i) => "vehicles/telegram-" + (786+i) + "-0123456789abcdef.webp");
const draft = {inbox_id:786,status:"awaiting_review",source_caption:caption,ai_json:JSON.stringify({publish_media_keys:keys})};

test("owner-authorized Hummer draft creates a canonical 24-image vehicle without inventing ODO",()=>{
  const car = recoverOwnerVehicle(draft);
  assert.equal(car.id,"tg-786");
  assert.equal(car.brand,"HUMMER");
  assert.equal(car.model,"H2 Luxury");
  assert.equal(car.year,2009);
  assert.equal(car.price,2600000000);
  assert.equal(car.mileage,null);
  assert.equal(car.status,"available");
  assert.equal(car.description,caption);
  assert.equal(car.images.length,24);
  assert.equal(car.cover_image,car.images[0]);
});

test("refuses wrong draft, gallery count, duplicate keys, wrong price, or already failed status",()=>{
  assert.throws(()=>recoverOwnerVehicle({...draft,inbox_id:787}),/Wrong inbox/);
  assert.throws(()=>recoverOwnerVehicle({...draft,status:"failed"}),/not publishable/);
  assert.throws(()=>recoverOwnerVehicle({...draft,ai_json:JSON.stringify({publish_media_keys:keys.slice(0,23)})}),/24 distinct/);
  assert.throws(()=>recoverOwnerVehicle({...draft,ai_json:JSON.stringify({publish_media_keys:[...keys.slice(0,23),keys[0]]})}),/24 distinct/);
  assert.throws(()=>recoverOwnerVehicle({...draft,source_caption:caption.replace("2.600 tỷ","2.800 tỷ")}),/Unexpected owner price/);
  assert.throws(()=>recoverOwnerVehicle({...draft,source_caption:"Lexus H2 2009 Giá 2.600 tỷ"}),/identity/);
});
