import test from "node:test";
import assert from "node:assert/strict";
import { reorderCarImages } from "../src/vehicle-persistence.js";
import { handleAdminCars } from "../src/cms.js";

function makeDb(){
  const calls=[];
  const rows=[
    {id:11,url:"https://example.com/a.webp",sort_order:0,is_cover:1},
    {id:12,url:"https://example.com/b.webp",sort_order:1,is_cover:0},
    {id:13,url:"https://example.com/c.webp",sort_order:2,is_cover:0}
  ];
  const db={
    calls,
    prepare(sql){
      return {
        bind(...args){
          const stmt={sql,args,
            async first(){ if(sql.startsWith("SELECT id FROM cars")) return {id:"tg-714"}; return null; },
            async all(){ if(sql.startsWith("SELECT id,url,sort_order,is_cover FROM car_images")) return {results:rows.map(x=>({...x}))}; return {results:[]}; },
            async run(){ calls.push({sql,args,run:true}); return {meta:{changes:1}}; }
          };
          return stmt;
        }
      };
    },
    async batch(statements){
      calls.push(...statements.map(s=>({sql:s.sql,args:s.args,batch:true})));
      return statements.map(()=>({meta:{changes:1}}));
    }
  };
  return db;
}

test("gallery reorder preserves image rows and changes only order/cover metadata", async()=>{
  const db=makeDb();
  const result=await reorderCarImages(db,"tg-714",[13,11,12],13,{actor:"test"});
  assert.equal(result.ok,true);
  assert.equal(result.cover_image,"https://example.com/c.webp");
  assert.deepEqual(result.images.map(x=>x.id),[13,11,12]);
  assert.deepEqual(result.images.map(x=>x.sort_order),[0,1,2]);
  assert.equal(result.images[0].is_cover,1);
  assert.equal(db.calls.some(x=>/DELETE FROM car_images/i.test(x.sql||"")),false);
  assert.equal(db.calls.filter(x=>/UPDATE car_images SET sort_order=/i.test(x.sql||"")).length,3);
  assert.ok(db.calls.some(x=>/UPDATE cars SET cover_image=/i.test(x.sql||"")));
  assert.ok(db.calls.some(x=>/INSERT INTO cms_audit_log/i.test(x.sql||"")));
});

test("gallery reorder rejects incomplete or mismatched image sets", async()=>{
  const db=makeDb();
  const missing=await reorderCarImages(db,"tg-714",[11,12],11);
  assert.equal(missing.ok,false);
  assert.equal(missing.status,400);
  const wrong=await reorderCarImages(db,"tg-714",[11,12,99],11);
  assert.equal(wrong.ok,false);
  assert.equal(wrong.status,400);
  assert.equal(db.calls.some(x=>/DELETE FROM car_images/i.test(x.sql||"")),false);
});

test("admin gallery order endpoint uses non-destructive reorder contract", async()=>{
  const db=makeDb();
  const req=new Request("https://phanthuanxtra.com/api/admin/cars/tg-714/images/order",{
    method:"PUT",
    headers:{"content-type":"application/json","X-PTX-Actor":"test-suite"},
    body:JSON.stringify({image_ids:[12,13,11],cover_image_id:12})
  });
  const res=await handleAdminCars(req,{DB:db});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.ok,true);
  assert.equal(body.cover_image_id,12);
  assert.deepEqual(body.images.map(x=>x.id),[12,13,11]);
  assert.equal(db.calls.some(x=>/DELETE FROM car_images/i.test(x.sql||"")),false);
});
