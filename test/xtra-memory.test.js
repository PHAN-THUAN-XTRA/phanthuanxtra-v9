import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { extractMemorySignals, formatCustomerMemory, normalizePhone, procedureState } from "../src/customer-memory.js";

test("customer identity normalizes Vietnamese phone numbers deterministically",()=>{
  assert.equal(normalizePhone("0909 123 456"),"84909123456");
  assert.equal(normalizePhone("+84 909 123 456"),"84909123456");
  assert.equal(normalizePhone("123"),"");
});

test("episodic memory classifies vehicle intent and redacts phone from summaries",()=>{
  const signals=extractMemorySignals({
    message:"Tôi muốn lái thử Lexus LX 600, gọi 0909 123 456",
    hasPhone:true,
    cars:[{id:"tg-lexus",brand:"Lexus",model:"LX 600",category:"suv"}]
  });
  assert.equal(signals.eventType,"contact_shared");
  assert.equal(signals.subjectType,"vehicle");
  assert.equal(signals.subjectId,"tg-lexus");
  assert.match(signals.summary,/SĐT đã cung cấp/);
  assert.doesNotMatch(signals.summary,/0909 123 456/);
  assert.ok(signals.facts.some(x=>x.key==="preferred_brand"&&x.value==="Lexus"));
  assert.ok(signals.facts.some(x=>x.key==="preferred_vehicle_id"&&x.value==="tg-lexus"));
});

test("semantic memory prompt exposes known-contact state without raw phone",()=>{
  const memory={
    profile:{display_name:"Nguyễn Văn An"},
    knownPhone:true,
    phone:"84909123456",
    facts:[{fact_key:"preferred_brand",fact_value:"Lexus"}],
    episodes:[{event_type:"vehicle_interest",summary:"Quan tâm Lexus LX 600",happened_at:"2026-10-02"}]
  };
  const text=formatCustomerMemory(memory);
  assert.match(text,/known_name: Nguyễn Văn An/);
  assert.match(text,/known_phone: true/);
  assert.match(text,/preferred_brand=Lexus/);
  assert.doesNotMatch(text,/84909123456/);
  const state=procedureState(memory);
  assert.equal(state.knownPhone,true);
  assert.equal(state.preferredBrand,"Lexus");
});

test("browser keeps durable visitor identity and sends it to chat plus lead endpoints",()=>{
  const source=fs.readFileSync("public/script.js","utf8");
  assert.match(source,/ptx:visitor_id/);
  assert.match(source,/visitor_id:visitorId/);
  assert.match(source,/\/api\/ai-chat/);
  assert.match(source,/\/api\/leads/);
});

test("D1 migration creates customer identity, episodic and semantic memory stores",()=>{
  const sql=fs.readFileSync("migrations/0027_xtra_customer_memory.sql","utf8");
  for(const marker of [
    "CREATE TABLE IF NOT EXISTS xtra_memory_customers",
    "CREATE TABLE IF NOT EXISTS xtra_memory_identities",
    "CREATE TABLE IF NOT EXISTS xtra_memory_episodes",
    "CREATE TABLE IF NOT EXISTS xtra_memory_facts",
    "CREATE TABLE IF NOT EXISTS xtra_memory_jobs_processed",
    "CREATE TABLE IF NOT EXISTS xtra_memory_conversation_links",
    "CREATE TABLE IF NOT EXISTS xtra_memory_lead_links"
  ]) assert.ok(sql.includes(marker),marker);
  assert.doesNotMatch(sql,/ALTER TABLE (ai_conversations|leads)/);
});

test("production config provisions a dedicated durable memory queue with DLQ",()=>{
  const cfg=JSON.parse(fs.readFileSync("wrangler.json","utf8"));
  assert.ok(cfg.queues?.producers?.some(x=>x.binding==="MEMORY_JOBS"&&x.queue==="ptx-memory-jobs"));
  const consumer=cfg.queues?.consumers?.find(x=>x.queue==="ptx-memory-jobs");
  assert.equal(consumer?.dead_letter_queue,"ptx-memory-jobs-dlq");
  assert.equal(consumer?.max_retries,5);

  const deploy=fs.readFileSync("scripts/deploy-cloudflare-api.mjs","utf8");
  for(const marker of [
    'const MEMORY_QUEUE = "ptx-memory-jobs"',
    'const MEMORY_DLQ = "ptx-memory-jobs-dlq"',
    'name: "MEMORY_JOBS", type: "queue", queue_name: MEMORY_QUEUE',
    "ensureMemoryQueueResources()",
    "ensureMemoryQueueConsumer(memoryQueues.primary)",
    "verifyMemoryQueueDeployment(memoryQueues.primary)"
  ]) assert.ok(deploy.includes(marker),marker);
});

test("queue handler separates memory jobs from vehicle publishing jobs",()=>{
  const entry=fs.readFileSync("src/entry.js","utf8");
  assert.match(entry,/batch\?\.queue==="ptx-memory-jobs"/);
  assert.match(entry,/consumeMemoryJobs\(batch,env\)/);
  assert.match(entry,/consumeTelegramVehicleDraftJobs\(batch,env\)/);
});

test("AI chat loads customer memory and disables shared response cache for customer-specific prompts",()=>{
  const source=fs.readFileSync("src/ai-chat.js","utf8");
  assert.match(source,/resolveCustomer/);
  assert.match(source,/loadCustomerMemory/);
  assert.match(source,/formatCustomerMemory/);
  assert.match(source,/customerMemory\)return null/);
  assert.match(source,/known_phone: true/);
  assert.match(source,/enqueueMemoryEvent/);
});
