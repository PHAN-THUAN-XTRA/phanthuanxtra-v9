import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateTelegramMiniAppInitData, handleTelegramMiniAppApi } from "../src/telegram-mini-app.js";

const botFixture="fixture-value";
async function hmac(keyBytes,value){
  const key=await crypto.subtle.importKey("raw",keyBytes,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)));
}
const hex=bytes=>[...bytes].map(v=>v.toString(16).padStart(2,"0")).join("");
async function signedInitData({userId=6451516147,authDate=1700000000}={}){
  const p=new URLSearchParams({auth_date:String(authDate),query_id:"AA-test",user:JSON.stringify({id:userId,first_name:"Thuần",username:"owner"})});
  const check=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
  const secret=await hmac(new TextEncoder().encode("WebAppData"),botFixture);
  p.set("hash",hex(await hmac(secret,check)));
  return p.toString();
}

test("Telegram Mini App validates signed initData and rejects tampering or stale sessions",async()=>{
  const now=1700000300,valid=await signedInitData();
  const ok=await validateTelegramMiniAppInitData(valid,botFixture,{now});
  assert.equal(ok.ok,true);
  assert.equal(Number(ok.user.id),6451516147);
  const tampered=valid.replace("owner","attacker");
  assert.equal((await validateTelegramMiniAppInitData(tampered,botFixture,{now})).ok,false);
  assert.equal((await validateTelegramMiniAppInitData(await signedInitData({authDate:1699990000}),botFixture,{now})).reason,"expired");
});

test("Mini App API requires Telegram signature before D1 access",async()=>{
  let touched=false;
  const env={TELEGRAM_AUTO_BOT_TOKEN:botFixture,TELEGRAM_AUTO_PUBLISH_CHAT_IDS:"6451516147",DB:{prepare(){touched=true;throw new Error("must not touch DB");}}};
  const response=await handleTelegramMiniAppApi(new Request("https://phanthuanxtra.com/api/telegram/mini/v1/cars"),env);
  assert.equal(response.status,401);
  assert.equal(touched,false);
});

test("Mini App contract is scoped to safe vehicle status management with no delete route",()=>{
  const source=fs.readFileSync(new URL("../src/telegram-mini-app.js",import.meta.url),"utf8");
  const entry=fs.readFileSync(new URL("../src/entry.js",import.meta.url),"utf8");
  const ui=fs.readFileSync(new URL("../public/telegram-mini-app.html",import.meta.url),"utf8");
  const router=fs.readFileSync(new URL("../src/telegram-router.js",import.meta.url),"utf8");
  const headers=fs.readFileSync(new URL("../public/_headers",import.meta.url),"utf8");
  assert.match(source,/available","reserved","sold","hidden/);
  assert.match(source,/X-Telegram-Init-Data/);
  assert.match(source,/actor:"telegram-mini-app"/);
  assert.match(source,/method==="PATCH"/);
  assert.match(source,/reorderCarImages/);
  assert.match(source,/cms_audit_log/);
  assert.match(source,/public_url/);
  assert.match(source,/allowed=\["brand","model","year","mileage","price","fuel","category","color","description","featured"\]/);
  assert.doesNotMatch(source,/method==="DELETE"/);
  assert.doesNotMatch(ui,/ADMIN_TOKEN|ptx_admin_token/);
  assert.match(ui,/Telegram\.WebApp|window\.Telegram/);
  assert.match(ui,/Chi tiết \/ Sửa/);
  assert.match(ui,/Xem trang public/);
  assert.match(ui,/Thứ tự ảnh \/ Cover/);
  assert.match(ui,/Lịch sử thay đổi/);
  assert.match(router,/command\?\.name==="carapp"/);
  assert.match(router,/web_app:\{url:"https:\/\/phanthuanxtra\.com\/telegram-mini-app\.html"\}/);
  const miniHeaderBlock=headers.slice(headers.indexOf("/telegram-mini-app.html"));
  assert.ok(miniHeaderBlock.includes("! X-Frame-Options"));
  assert.ok(miniHeaderBlock.includes("Content-Security-Policy: frame-ancestors https://web.telegram.org https://*.telegram.org"));
  assert.match(entry,/url\.pathname === "\/telegram-mini-app\.html"/);
  assert.match(entry,/headers\.delete\("x-frame-options"\)/);
  assert.match(entry,/headers\.delete\("content-security-policy"\)/);
  assert.match(entry,/x-ptx-telegram-mini-app/);
});


test("Customer Care Mini App reuses Memory Brain with safe owner mutations and no delete",()=>{
  const source=fs.readFileSync(new URL("../src/telegram-mini-app.js",import.meta.url),"utf8");
  const ui=fs.readFileSync(new URL("../public/telegram-mini-app.html",import.meta.url),"utf8");
  const router=fs.readFileSync(new URL("../src/telegram-router.js",import.meta.url),"utf8");
  const migration=fs.readFileSync(new URL("../migrations/0028_xtra_customer_care.sql",import.meta.url),"utf8");
  assert.match(source,/CARE_STATUSES/);
  assert.match(source,/xtra_memory_customers/);
  assert.match(source,/xtra_memory_identities/);
  assert.match(source,/xtra_memory_episodes/);
  assert.match(source,/xtra_memory_facts/);
  assert.match(source,/xtra_memory_lead_links/);
  assert.match(source,/xtra_customer_care/);
  assert.match(source,/xtra_customer_care_audit/);
  assert.match(source,/telegram-customer-mini-app/);
  assert.match(source,/ai-customer-agent/);
  assert.match(source,/deterministicCustomerSummary/);
  assert.match(source,/customer=u\.pathname\.match/);
  assert.match(source,/ai-summary/);
  assert.doesNotMatch(source,/DELETE FROM xtra_memory_customers/);
  assert.doesNotMatch(source,/DELETE FROM xtra_customer_care/);
  assert.match(router,/command\?\.name==="customerapp"/);
  assert.match(router,/telegram-mini-app\.html\?view=customers/);
  assert.match(router,/Không có chức năng xóa khách hàng/);
  assert.match(ui,/Chăm sóc khách hàng/);
  assert.match(ui,/AI cập nhật tóm tắt/);
  assert.match(ui,/Lịch sử tương tác/);
  assert.match(ui,/Audit chăm sóc/);
  assert.doesNotMatch(ui,/Xóa khách|DELETE khách/);
  assert.match(migration,/customer_id TEXT PRIMARY KEY/);
  assert.match(migration,/FOREIGN KEY \(customer_id\) REFERENCES xtra_memory_customers/);
});


test("Customer Care operational list hides CI fixtures and anonymous one-shot noise without deleting memory",()=>{
  const source=fs.readFileSync(new URL("../src/telegram-mini-app.js",import.meta.url),"utf8");
  assert.match(source,/UPPER\(COALESCE\(c\.display_name,''\)\) NOT LIKE 'CI-%'/);
  assert.match(source,/UPPER\(ti\.identity_value\) LIKE 'CI-%'/);
  assert.match(source,/xtra_memory_lead_links ol/);
  assert.match(source,/xtra_memory_facts ofa/);
  assert.match(source,/COUNT\(\*\).*xtra_memory_episodes oe/);
  assert.doesNotMatch(source,/DELETE FROM xtra_memory_customers/);
  assert.doesNotMatch(source,/DELETE FROM xtra_memory_episodes/);
});


test("Autonomous Customer Care is evidence-first and keeps important stage changes human-approved",()=>{
  const memory=fs.readFileSync(new URL("../src/customer-memory.js",import.meta.url),"utf8");
  const api=fs.readFileSync(new URL("../src/telegram-mini-app.js",import.meta.url),"utf8");
  const ui=fs.readFileSync(new URL("../public/telegram-mini-app.html",import.meta.url),"utf8");
  const migration=fs.readFileSync(new URL("../migrations/0029_xtra_customer_care_proposals.sql",import.meta.url),"utf8");
  assert.match(memory,/careProposal/);
  assert.match(memory,/test_drive_requested/);
  assert.match(memory,/contact_shared/);
  assert.match(memory,/price_asked/);
  assert.match(memory,/availability_asked/);
  assert.match(memory,/vehicle_interest/);
  assert.match(memory,/proposal\.value==="contacting".*currentStatus==="new".*proposal\.confidence>=0\.95/s);
  assert.match(memory,/xtra_customer_care_proposals/);
  assert.match(memory,/evidence_auto_update/);
  assert.match(api,/decideCustomerProposal/);
  assert.match(api,/proposal_decision/);
  assert.match(api,/approve/);
  assert.match(api,/reject/);
  assert.match(ui,/AI đề xuất chăm sóc/);
  assert.match(ui,/Duyệt/);
  assert.match(ui,/Bỏ qua/);
  assert.doesNotMatch(api,/DELETE FROM xtra_customer_care_proposals/);
  assert.match(migration,/evidence_episode_id/);
  assert.match(migration,/status TEXT NOT NULL DEFAULT 'pending'/);
});


test("Customer Care delete requires explicit customer-bound confirmation and preserves source leads",()=>{
  const api=fs.readFileSync(new URL("../src/telegram-mini-app.js",import.meta.url),"utf8");
  const ui=fs.readFileSync(new URL("../public/telegram-mini-app.html",import.meta.url),"utf8");
  assert.match(api,/body\?\.confirm!=="DELETE_CUSTOMER"\|\|body\?\.customer_id!==id/);
  assert.match(api,/DELETE FROM xtra_memory_lead_links WHERE customer_id=\?/);
  assert.match(api,/DELETE FROM xtra_memory_customers WHERE id=\?/);
  assert.doesNotMatch(api,/DELETE FROM leads WHERE/);
  assert.match(ui,/Xóa khách hàng/);
  assert.match(ui,/method:"DELETE"/);
  assert.match(ui,/Lead gốc vẫn được giữ/);
  assert.match(ui,/showConfirm/);
});
