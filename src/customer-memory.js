const MAX_IDENTITY = 180;
const MAX_MEMORY_SUMMARY = 600;
const PHONE_RE = /(?:\+?84|0)(?:\D*\d){9,10}/g;
const FACT_KEYS = new Set(["preferred_brand","preferred_body_type","preferred_vehicle_id","preferred_contact_channel"]);

const clean=(value,max=MAX_IDENTITY)=>String(value??"").trim().slice(0,max);
const foldVi=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
const makeId=prefix=>`${prefix}_${crypto.randomUUID()}`;

export function normalizePhone(value){
  const digits=String(value??"").replace(/\D/g,"");
  if(digits.length<9||digits.length>12)return "";
  if(digits.startsWith("84"))return digits;
  if(digits.startsWith("0"))return `84${digits.slice(1)}`;
  return digits;
}

function redactPhone(value){
  return clean(value,MAX_MEMORY_SUMMARY).replace(PHONE_RE,"[SĐT đã cung cấp]");
}

async function firstBound(bound){
  if(typeof bound?.first==="function")return await bound.first();
  if(typeof bound?.all==="function"){
    const result=await bound.all();
    return result?.results?.[0]||null;
  }
  return null;
}

async function identityCustomer(db,type,value){
  if(!value)return null;
  return await firstBound(db.prepare("SELECT customer_id FROM xtra_memory_identities WHERE identity_type=? AND identity_value=? LIMIT 1").bind(type,value));
}

async function mergeCustomers(db,canonicalId,duplicateId){
  if(!canonicalId||!duplicateId||canonicalId===duplicateId)return;
  await db.prepare("UPDATE xtra_memory_episodes SET customer_id=? WHERE customer_id=?").bind(canonicalId,duplicateId).run();
  await db.prepare("UPDATE OR IGNORE xtra_memory_facts SET customer_id=? WHERE customer_id=?").bind(canonicalId,duplicateId).run();
  await db.prepare("DELETE FROM xtra_memory_facts WHERE customer_id=?").bind(duplicateId).run();
  await db.prepare("UPDATE xtra_memory_conversation_links SET customer_id=?,updated_at=CURRENT_TIMESTAMP WHERE customer_id=?").bind(canonicalId,duplicateId).run();
  await db.prepare("UPDATE xtra_memory_lead_links SET customer_id=? WHERE customer_id=?").bind(canonicalId,duplicateId).run();
  await db.prepare("UPDATE OR IGNORE xtra_memory_identities SET customer_id=? WHERE customer_id=?").bind(canonicalId,duplicateId).run();
  await db.prepare("DELETE FROM xtra_memory_identities WHERE customer_id=?").bind(duplicateId).run();
  await db.prepare("DELETE FROM xtra_memory_customers WHERE id=?").bind(duplicateId).run();
}

export async function resolveCustomer(env,{visitorId="",phone="",name="",channel="website"}={}){
  if(!env?.DB)return null;
  const db=env.DB;
  const visitor=clean(visitorId,160);
  const canonicalPhone=normalizePhone(phone);
  const phoneHit=canonicalPhone ? await identityCustomer(db,"phone",canonicalPhone) : null;
  const visitorHit=visitor ? await identityCustomer(db,channel==="telegram"?"telegram_visitor":"web_visitor",visitor) : null;
  let customerId=phoneHit?.customer_id||visitorHit?.customer_id||"";
  if(phoneHit?.customer_id&&visitorHit?.customer_id&&phoneHit.customer_id!==visitorHit.customer_id){
    customerId=phoneHit.customer_id;
    await mergeCustomers(db,customerId,visitorHit.customer_id);
  }
  if(!customerId){
    customerId=makeId("cus");
    await db.prepare("INSERT INTO xtra_memory_customers (id,display_name,status,created_at,updated_at,last_seen_at) VALUES (?,?,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
      .bind(customerId,clean(name,120)||null).run();
  }else{
    await db.prepare("UPDATE xtra_memory_customers SET display_name=CASE WHEN ?<>'' THEN ? ELSE display_name END,updated_at=CURRENT_TIMESTAMP,last_seen_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(clean(name,120),clean(name,120),customerId).run();
  }
  const identities=[];
  if(canonicalPhone)identities.push(["phone",canonicalPhone,0]);
  if(visitor)identities.push([channel==="telegram"?"telegram_visitor":"web_visitor",visitor,0]);
  for(const [type,value,verified] of identities){
    await db.prepare(`INSERT INTO xtra_memory_identities (customer_id,identity_type,identity_value,verified,created_at,last_seen_at)
      VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(identity_type,identity_value) DO UPDATE SET customer_id=excluded.customer_id,last_seen_at=CURRENT_TIMESTAMP`)
      .bind(customerId,type,value,verified).run();
  }
  return {customerId,phone:canonicalPhone,name:clean(name,120),returning:Boolean(phoneHit||visitorHit)};
}

export async function attachConversationCustomer(env,conversationId,customerId){
  if(!env?.DB||!conversationId||!customerId)return;
  await env.DB.prepare(`INSERT INTO xtra_memory_conversation_links (conversation_id,customer_id,updated_at)
    VALUES (?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(conversation_id) DO UPDATE SET customer_id=excluded.customer_id,updated_at=CURRENT_TIMESTAMP`)
    .bind(conversationId,customerId).run();
}

export async function linkLeadCustomer(env,leadId,customerId){
  if(!env?.DB||!leadId||!customerId)return;
  await env.DB.prepare(`INSERT INTO xtra_memory_lead_links (lead_id,customer_id,created_at)
    VALUES (?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(lead_id) DO UPDATE SET customer_id=excluded.customer_id`)
    .bind(Number(leadId),customerId).run();
}

export async function loadCustomerMemory(env,customerId){
  if(!env?.DB||!customerId)return {profile:null,facts:[],episodes:[],knownPhone:false,phone:""};
  const db=env.DB;
  const [profile,phoneRow,facts,episodes]=await Promise.all([
    firstBound(db.prepare("SELECT id,display_name,status,created_at,last_seen_at FROM xtra_memory_customers WHERE id=? LIMIT 1").bind(customerId)),
    firstBound(db.prepare("SELECT identity_value FROM xtra_memory_identities WHERE customer_id=? AND identity_type='phone' ORDER BY verified DESC,last_seen_at DESC LIMIT 1").bind(customerId)),
    db.prepare("SELECT fact_key,fact_value,confidence,last_confirmed_at FROM xtra_memory_facts WHERE customer_id=? AND status='active' AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) ORDER BY last_confirmed_at DESC LIMIT 20").bind(customerId).all(),
    db.prepare("SELECT event_type,subject_type,subject_id,summary,outcome,happened_at FROM xtra_memory_episodes WHERE customer_id=? ORDER BY happened_at DESC LIMIT 8").bind(customerId).all()
  ]);
  return {profile:profile||null,phone:phoneRow?.identity_value||"",knownPhone:Boolean(phoneRow?.identity_value),facts:facts?.results||[],episodes:episodes?.results||[]};
}

export function formatCustomerMemory(memory){
  if(!memory?.profile&&!memory?.facts?.length&&!memory?.episodes?.length)return "";
  const facts=(memory.facts||[]).map(x=>`${x.fact_key}=${x.fact_value}`).join("; ")||"none";
  const episodes=(memory.episodes||[]).slice(0,5).map(x=>`[${x.happened_at||"unknown"}] ${x.event_type}: ${x.summary}`).join("\n")||"none";
  return [
    `known_name: ${memory.profile?.display_name||"unknown"}`,
    `known_phone: ${memory.knownPhone?"true":"false"}`,
    `facts: ${facts}`,
    "recent_episodes:",
    episodes
  ].join("\n");
}

export function procedureState(memory){
  const facts=Object.fromEntries((memory?.facts||[]).map(x=>[x.fact_key,x.fact_value]));
  return {
    returningCustomer:Boolean(memory?.profile&&(memory?.episodes?.length||memory?.facts?.length)),
    knownName:clean(memory?.profile?.display_name,120),
    knownPhone:Boolean(memory?.knownPhone),
    preferredVehicleId:facts.preferred_vehicle_id||"",
    preferredBrand:facts.preferred_brand||""
  };
}

function findVehicle(message,cars=[]){
  const folded=foldVi(message);
  let brand="";
  let vehicle=null;
  for(const car of cars){
    const carBrand=clean(car.brand,100);
    const model=clean(car.model||car.name,160);
    if(carBrand&&folded.includes(foldVi(carBrand)))brand=brand||carBrand;
    if(model&&foldVi(model).length>=3&&folded.includes(foldVi(model))){
      vehicle=car;
      brand=carBrand||brand;
      break;
    }
  }
  return {brand,vehicle};
}

export function extractMemorySignals({message="",cars=[],hasPhone=false}={}){
  const folded=foldVi(message);
  const {brand,vehicle}=findVehicle(message,cars);
  let eventType="conversation_turn";
  if(hasPhone)eventType="contact_shared";
  else if(/\b(lai thu|test drive)\b/.test(folded))eventType="test_drive_requested";
  else if(/\b(gia|bao nhieu|price)\b/.test(folded))eventType="price_asked";
  else if(/\b(con khong|tinh trang|available|availability)\b/.test(folded))eventType="availability_asked";
  else if(vehicle||brand)eventType="vehicle_interest";
  const facts=[];
  if(brand)facts.push({key:"preferred_brand",value:brand,confidence:0.9});
  if(vehicle?.id)facts.push({key:"preferred_vehicle_id",value:String(vehicle.id),confidence:0.95});
  for(const [needle,value] of [["suv","suv"],["sedan","sedan"],["coupe","coupe"],["pickup","pickup"],["mpv","mpv"]]){
    if(new RegExp(`\\b${needle}\\b`).test(folded)){facts.push({key:"preferred_body_type",value,confidence:0.85});break;}
  }
  if(/\bzalo\b/.test(folded))facts.push({key:"preferred_contact_channel",value:"zalo",confidence:0.9});
  else if(/\btelegram\b/.test(folded))facts.push({key:"preferred_contact_channel",value:"telegram",confidence:0.9});
  else if(/\b(goi|dien thoai|phone|call)\b/.test(folded))facts.push({key:"preferred_contact_channel",value:"phone",confidence:0.75});
  return {
    eventType,
    subjectType:vehicle?.id?"vehicle":null,
    subjectId:vehicle?.id?String(vehicle.id):null,
    summary:redactPhone(message)||eventType,
    facts:facts.filter(x=>FACT_KEYS.has(x.key)&&x.value)
  };
}

function careProposal(signals,{hasPhone=false}={}){
  const type=signals?.eventType||"conversation_turn";
  if(type==="test_drive_requested")return {value:"appointment",confidence:0.96,rationale:"Khách chủ động yêu cầu lái thử."};
  if(type==="contact_shared"&&hasPhone)return {value:"contacting",confidence:0.95,rationale:"Khách đã chủ động cung cấp số điện thoại."};
  if(type==="price_asked"||type==="availability_asked"||type==="vehicle_interest")return {value:"consulting",confidence:0.88,rationale:"Khách thể hiện nhu cầu tư vấn xe có bằng chứng trong hội thoại."};
  return null;
}
async function updateCareAutomation(db,customerId,signals,episodeId,{hasPhone=false}={}){
  const proposal=careProposal(signals,{hasPhone});
  if(!proposal)return;
  const current=await firstBound(db.prepare("SELECT care_status FROM xtra_customer_care WHERE customer_id=? LIMIT 1").bind(customerId));
  const currentStatus=current?.care_status||"new";
  // Only the low-risk transition new -> contacting is automatic when the customer explicitly shared a phone.
  if(proposal.value==="contacting"&&currentStatus==="new"&&proposal.confidence>=0.95){
    await db.prepare(`INSERT INTO xtra_customer_care(customer_id,care_status,updated_by,updated_at)
      VALUES (?,'contacting','ai-customer-agent',CURRENT_TIMESTAMP)
      ON CONFLICT(customer_id) DO UPDATE SET care_status='contacting',updated_by='ai-customer-agent',updated_at=CURRENT_TIMESTAMP`).bind(customerId).run();
    await db.prepare("INSERT INTO xtra_customer_care_audit(customer_id,actor,action,summary) VALUES (?,'ai-customer-agent','evidence_auto_update',?)")
      .bind(customerId,clean("care_status=contacting; evidence="+signals.eventType,500)).run();
    return;
  }
  if(currentStatus===proposal.value)return;
  const existing=await firstBound(db.prepare("SELECT id FROM xtra_customer_care_proposals WHERE customer_id=? AND proposal_type='care_status' AND proposed_value=? AND status='pending' LIMIT 1").bind(customerId,proposal.value));
  if(existing)return;
  await db.prepare(`INSERT INTO xtra_customer_care_proposals(id,customer_id,proposal_type,proposed_value,confidence,evidence_episode_id,rationale,status)
    VALUES (?,?,?,?,?,?,?,'pending')`).bind(makeId("prop"),customerId,"care_status",proposal.value,proposal.confidence,episodeId,proposal.rationale).run();
}

async function upsertFact(db,customerId,fact,episodeId,conversationId){
  if(!FACT_KEYS.has(fact.key)||!fact.value)return;
  await db.prepare("UPDATE xtra_memory_facts SET status='superseded',last_confirmed_at=CURRENT_TIMESTAMP WHERE customer_id=? AND fact_key=? AND fact_value<>? AND status='active'")
    .bind(customerId,fact.key,clean(fact.value,200)).run();
  await db.prepare(`INSERT INTO xtra_memory_facts (id,customer_id,fact_key,fact_value,source_episode_id,source_conversation_id,confidence,first_observed_at,last_confirmed_at,status)
    VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'active')
    ON CONFLICT(customer_id,fact_key,fact_value) DO UPDATE SET source_episode_id=excluded.source_episode_id,source_conversation_id=excluded.source_conversation_id,confidence=MAX(xtra_memory_facts.confidence,excluded.confidence),last_confirmed_at=CURRENT_TIMESTAMP,status='active'`)
    .bind(makeId("fact"),customerId,fact.key,clean(fact.value,200),episodeId,conversationId||null,Number(fact.confidence||1)).run();
}

export async function processMemoryEvent(env,event){
  if(!env?.DB||!event?.customerId||!event?.idempotencyKey)return {ok:false,skipped:true};
  const db=env.DB;
  const claim=await db.prepare("INSERT OR IGNORE INTO xtra_memory_jobs_processed (idempotency_key,status,created_at) VALUES (?,'processing',CURRENT_TIMESTAMP)").bind(event.idempotencyKey).run();
  if(Number(claim?.meta?.changes||0)===0)return {ok:true,duplicate:true};
  try{
    const signals=extractMemorySignals({message:event.message,cars:event.cars,hasPhone:Boolean(event.hasPhone)});
    const episodeId=makeId("ep");
    await db.prepare(`INSERT INTO xtra_memory_episodes (id,customer_id,conversation_id,event_type,subject_type,subject_id,summary,outcome,source,happened_at,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
      .bind(episodeId,event.customerId,event.conversationId||null,signals.eventType,signals.subjectType,signals.subjectId,signals.summary,clean(event.outcome,160)||null,clean(event.source,60)||"website").run();
    for(const fact of signals.facts)await upsertFact(db,event.customerId,fact,episodeId,event.conversationId);
    await updateCareAutomation(db,event.customerId,signals,episodeId,{hasPhone:Boolean(event.hasPhone)});
    await db.prepare("UPDATE xtra_memory_customers SET updated_at=CURRENT_TIMESTAMP,last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(event.customerId).run();
    await db.prepare("UPDATE xtra_memory_jobs_processed SET status='done',processed_at=CURRENT_TIMESTAMP WHERE idempotency_key=?").bind(event.idempotencyKey).run();
    return {ok:true,episodeId,eventType:signals.eventType,facts:signals.facts.length};
  }catch(error){
    await db.prepare("DELETE FROM xtra_memory_jobs_processed WHERE idempotency_key=? AND status='processing'").bind(event.idempotencyKey).run().catch(()=>{});
    throw error;
  }
}

export async function enqueueMemoryEvent(env,event){
  if(!event?.customerId)return {queued:false};
  const payload={
    idempotencyKey:event.idempotencyKey||makeId("mem"),
    customerId:event.customerId,
    conversationId:clean(event.conversationId,100)||null,
    source:clean(event.source,60)||"website",
    message:redactPhone(event.message),
    outcome:clean(event.outcome,160),
    hasPhone:Boolean(event.hasPhone),
    cars:Array.isArray(event.cars)?event.cars.slice(0,20).map(car=>({id:car.id,brand:car.brand,model:car.model||car.name,category:car.category})):[],
    createdAt:new Date().toISOString()
  };
  if(env?.MEMORY_JOBS?.send){
    await env.MEMORY_JOBS.send(payload);
    return {queued:true,idempotencyKey:payload.idempotencyKey};
  }
  try{
    const result=await processMemoryEvent(env,payload);
    return {queued:false,inline:true,...result};
  }catch(error){
    console.warn("memory_event_inline_failed",String(error?.message||error));
    return {queued:false,inline:false,error:true};
  }
}

export async function consumeMemoryJobs(batch,env){
  let processed=0,failed=0,duplicates=0;
  for(const message of batch?.messages||[]){
    try{
      const result=await processMemoryEvent(env,message.body||{});
      if(result?.duplicate)duplicates+=1;else processed+=1;
      message.ack?.();
    }catch(error){
      failed+=1;
      console.error("memory_queue_job_failed",String(error?.message||error));
      message.retry?.();
    }
  }
  return {processed,failed,duplicates};
}
