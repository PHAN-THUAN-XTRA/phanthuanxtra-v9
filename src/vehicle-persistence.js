const CAR_STATUSES = new Set(["available", "reserved", "sold", "hidden"]);
const text = (value, max = 1000) => String(value ?? "").trim().slice(0, max);
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const nullableInteger = (value, fallback = null) => value === null || value === "" || value === undefined ? fallback : (Number.isFinite(Number(value)) ? Number(value) : fallback);
const bool = value => value === true || value === 1 || value === "1" || value === "true";
export const validCarId = value => /^[a-z0-9][a-z0-9_-]{2,80}$/i.test(String(value ?? ""));

export function normalizeCarPayload(body, existing = {}) {
  const brand = text(body?.brand ?? existing.brand, 100);
  const model = text(body?.model ?? existing.model, 160);
  const status = text(body?.status ?? existing.status ?? "available", 30).toLowerCase();
  if (!brand || !model) return { error: "brand và model là bắt buộc" };
  if (!CAR_STATUSES.has(status)) return { error: `status phải là: ${[...CAR_STATUSES].join(", ")}` };
  let previousFeatures = [];
  try { previousFeatures = existing.features_json ? JSON.parse(existing.features_json) : []; } catch {}
  return { value: { brand, model, year: body?.year === null ? null : integer(body?.year ?? existing.year, 0) || null, mileage: Object.prototype.hasOwnProperty.call(body ?? {}, "mileage") ? nullableInteger(body.mileage, existing.mileage ?? null) : (existing.mileage ?? null), price: integer(body?.price ?? existing.price, 0), fuel: text(body?.fuel ?? existing.fuel, 100), category: text(body?.category ?? existing.category, 40), color: text(body?.color ?? existing.color, 80), status, description: text(body?.description ?? existing.description, 10000), features: Array.isArray(body?.features) ? body.features.slice(0,80).map(x=>text(x,300)) : previousFeatures, featured: bool(body?.featured ?? existing.featured), cover_image: text(body?.cover_image ?? existing.cover_image, 200000) } };
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images.slice(0,30).map((item,index)=>typeof item === "string" ? {url:text(item,200000),sort_order:index,is_cover:index===0} : {url:text(item?.url,200000),sort_order:integer(item?.sort_order,index),is_cover:bool(item?.is_cover)}).filter(x=>/^https?:\/\//i.test(x.url));
}
export async function replaceCarImages(db, carId, images) {
  await db.prepare("DELETE FROM car_images WHERE car_id=?").bind(carId).run();
  const list=normalizeImages(images); if(!list.length)return;
  const coverIndex=list.findIndex(x=>x.is_cover);
  await db.batch(list.map((item,index)=>db.prepare("INSERT INTO car_images (car_id,url,sort_order,is_cover) VALUES (?,?,?,?)").bind(carId,item.url,index,coverIndex===-1?(index===0?1:0):(index===coverIndex?1:0))));
}
export async function carImages(db, carId) { const q=await db.prepare("SELECT id,url,sort_order,is_cover FROM car_images WHERE car_id=? ORDER BY sort_order,id").bind(carId).all(); return q.results||[]; }

export async function reorderCarImages(db, carId, imageIds, coverImageId, { actor="gallery-order-api" }={}) {
  const id=text(carId,81);
  if(!validCarId(id)) return {ok:false,status:400,error:"ID bài đăng không hợp lệ"};
  const car=await db.prepare("SELECT id FROM cars WHERE id=?").bind(id).first();
  if(!car) return {ok:false,status:404,error:"Không tìm thấy xe"};

  const q=await db.prepare("SELECT id,url,sort_order,is_cover FROM car_images WHERE car_id=? ORDER BY sort_order,id").bind(id).all();
  const current=q.results||[];
  if(!Array.isArray(imageIds)||imageIds.length!==current.length) return {ok:false,status:400,error:"Danh sách ảnh phải chứa đầy đủ ảnh hiện tại"};

  const normalized=imageIds.map(Number);
  if(normalized.some(x=>!Number.isInteger(x)||x<=0)||new Set(normalized).size!==normalized.length) return {ok:false,status:400,error:"image_ids không hợp lệ hoặc bị trùng"};

  const byId=new Map(current.map(row=>[Number(row.id),row]));
  if(normalized.some(imageId=>!byId.has(imageId))) return {ok:false,status:400,error:"image_ids không khớp gallery hiện tại"};

  const coverId=Number(coverImageId);
  if(!Number.isInteger(coverId)||!byId.has(coverId)) return {ok:false,status:400,error:"cover_image_id không hợp lệ"};

  const coverUrl=byId.get(coverId).url;
  const statements=normalized.map((imageId,index)=>
    db.prepare("UPDATE car_images SET sort_order=?,is_cover=? WHERE car_id=? AND id=?").bind(index,imageId===coverId?1:0,id,imageId)
  );
  statements.push(db.prepare("UPDATE cars SET cover_image=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(coverUrl,id));
  const summary="images="+normalized.length+"; cover_image_id="+coverId;
  statements.push(db.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES (?,?,?,?,?)").bind(text(actor,100),"gallery_order","car",id,text(summary,500)));
  await db.batch(statements);

  return {
    ok:true,
    status:200,
    id,
    cover_image:coverUrl,
    cover_image_id:coverId,
    images:normalized.map((imageId,index)=>({...byId.get(imageId),sort_order:index,is_cover:imageId===coverId?1:0}))
  };
}

export async function setCarVisibility(db, carId, visible, { actor="visibility-api" }={}) {
  const id=text(carId,81);
  if(!validCarId(id)) return {ok:false,status:400,error:"ID bài đăng không hợp lệ"};
  const existing=await db.prepare("SELECT id,brand,model,status FROM cars WHERE id=?").bind(id).first();
  if(!existing) return {ok:false,status:404,error:"Không tìm thấy xe"};
  const status=visible?"available":"hidden";
  if(existing.status!==status){
    await db.prepare("UPDATE cars SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
    const summary="status="+status+"; previous="+existing.status;
    await db.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES (?,?,?,?,?)").bind(text(actor,100),"visibility","car",id,text(summary,500)).run();
  }
  return {ok:true,status:200,id,visibility:visible?"visible":"hidden",car:{...existing,status}};
}

export async function saveCar(db, body, { id, mode="create", actor="publish-core" }={}) {
  const carId=text(id ?? body?.id,81);
  if(!validCarId(carId)) return { ok:false,status:400,error:"id phải gồm 3-81 ký tự, chỉ chữ/số/-/_" };
  const existing=mode==="update" ? await db.prepare("SELECT * FROM cars WHERE id=?").bind(carId).first() : {};
  if(mode==="update"&&!existing) return {ok:false,status:404,error:"Không tìm thấy xe"};
  const parsed=normalizeCarPayload(body,existing); if(parsed.error)return{ok:false,status:400,error:parsed.error}; const v=parsed.value;
  try {
    if(mode==="create") await db.prepare("INSERT INTO cars (id,brand,model,year,mileage,price,fuel,category,color,status,description,features_json,featured,cover_image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(carId,v.brand,v.model,v.year,v.mileage,v.price,v.fuel,v.category,v.color,v.status,v.description,JSON.stringify(v.features),v.featured?1:0,v.cover_image).run();
    else await db.prepare("UPDATE cars SET brand=?,model=?,year=?,mileage=?,price=?,fuel=?,category=?,color=?,status=?,description=?,features_json=?,featured=?,cover_image=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(v.brand,v.model,v.year,v.mileage,v.price,v.fuel,v.category,v.color,v.status,v.description,JSON.stringify(v.features),v.featured?1:0,v.cover_image,carId).run();
    if(Object.prototype.hasOwnProperty.call(body,"images")) await replaceCarImages(db,carId,body.images);
    await db.prepare("INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary) VALUES (?,?,?,?,?)").bind(text(actor,100),mode==="create"?"create":"update","car",carId,text(`${v.brand} ${v.model}`,500)).run();
    return {ok:true,status:mode==="create"?201:200,id:carId,car:{...(await db.prepare("SELECT * FROM cars WHERE id=?").bind(carId).first()),images:await carImages(db,carId)}};
  } catch(error) { if(String(error?.message||error).includes("UNIQUE"))return{ok:false,status:409,error:"ID bài đăng đã tồn tại"}; throw error; }
}
