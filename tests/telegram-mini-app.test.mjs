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
  const ui=fs.readFileSync(new URL("../public/telegram-mini-app.html",import.meta.url),"utf8");
  const router=fs.readFileSync(new URL("../src/telegram-router.js",import.meta.url),"utf8");
  const headers=fs.readFileSync(new URL("../public/_headers",import.meta.url),"utf8");
  assert.match(source,/available","reserved","sold","hidden/);
  assert.match(source,/X-Telegram-Init-Data/);
  assert.match(source,/actor:"telegram-mini-app"/);
  assert.match(source,/method==="PATCH"/);
  assert.doesNotMatch(source,/method==="DELETE"/);
  assert.doesNotMatch(ui,/ADMIN_TOKEN|ptx_admin_token/);
  assert.match(ui,/Telegram\.WebApp|window\.Telegram/);
  assert.match(router,/command\?\.name==="carapp"/);
  assert.match(router,/web_app:\{url:"https:\/\/phanthuanxtra\.com\/telegram-mini-app\.html"\}/);
  const miniHeaderBlock=headers.slice(headers.indexOf("/telegram-mini-app.html"));
  assert.ok(miniHeaderBlock.includes("! X-Frame-Options"));
  assert.ok(miniHeaderBlock.includes("Content-Security-Policy: frame-ancestors https://web.telegram.org https://*.telegram.org"));
});
