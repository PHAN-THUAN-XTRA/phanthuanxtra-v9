import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";
const { recoverOwnerVehicle, persistFromVerifiedR2Keys } = await import("../scripts/publish-tg786-production.mjs");

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

test("trusted R2 fallback inserts exactly 24 ordered existing URLs with no R2 copy or reprocessing", async()=>{
  const vehicle=recoverOwnerVehicle(draft), calls=[];
  const d1=async(sql,params=[])=>{
    calls.push({sql,params});
    if(sql.startsWith("SELECT id,brand"))return [];
    if(sql.startsWith("SELECT url,sort_order"))return [];
    return [];
  };
  await persistFromVerifiedR2Keys(d1,vehicle);
  assert.equal(calls.filter(x=>x.sql.startsWith("INSERT INTO cars")).length,1);
  const gallery=calls.find(x=>x.sql.startsWith("INSERT INTO car_images"));
  assert.ok(gallery);
  assert.equal(gallery.params.length,96);
  assert.equal(gallery.params[1],vehicle.images[0]);
  assert.equal(gallery.params[3],1);
  assert.equal(gallery.params.at(-4),"tg-786");
  assert.equal(gallery.params.at(-3),vehicle.images[23]);
  assert.equal(gallery.params.at(-1),0);
  assert.ok(calls.every(x=>!/(DELETE|DROP|ALTER)/i.test(x.sql)));
});

test("existing R2 gallery is idempotent; conflicting canonical record is rejected", async()=>{
  const vehicle=recoverOwnerVehicle(draft), calls=[];
  const existing={id:"tg-786",brand:"HUMMER",model:"H2 Luxury",year:2009,price:2600000000,status:"available"};
  const d1=async(sql,params=[])=>{
    calls.push(sql);
    if(sql.startsWith("SELECT id,brand"))return [existing];
    if(sql.startsWith("SELECT url,sort_order"))return vehicle.images.map((url,i)=>({url,sort_order:i,is_cover:i===0?1:0}));
    return [];
  };
  await persistFromVerifiedR2Keys(d1,vehicle);
  assert.equal(calls.filter(x=>x.startsWith("INSERT INTO car_images")).length,0);
  assert.equal(calls.filter(x=>x.startsWith("INSERT INTO cars")).length,0);
  await assert.rejects(()=>persistFromVerifiedR2Keys(async sql=>sql.startsWith("SELECT id,brand")?[{...existing,status:"hidden"}]:[],vehicle),/conflicts/);
});
