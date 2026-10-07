import test from "node:test";
import assert from "node:assert/strict";
import { notifyTelegramCrm } from "../src/telegram-crm-notify.js";

function withMockFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => { globalThis.fetch = original; };
}

test("Business Jets synthetic CI leads are silent and deleted after delivery", async () => {
  const calls = [];
  const restore = withMockFetch(async (url, options) => {
    calls.push({url:String(url), body:JSON.parse(options.body)});
    if(String(url).includes("/sendMessage")) return new Response(JSON.stringify({ok:true,result:{message_id:101,chat:{id:999}}}), {status:200});
    return new Response(JSON.stringify({ok:true,result:true}), {status:200});
  });
  try {
    const result = await notifyTelegramCrm(
      {TELEGRAM_CRM_BOT_TOKEN:["fixture","token"].join("-"),TELEGRAM_CRM_CHAT_ID:"999"},
      {source:"business-jets",name:"CI-BUSINESS-JETS-123",phone:"0900000000",message:"synthetic"}
    );
    assert.equal(result.sent,true);
    assert.equal(result.synthetic,true);
    assert.equal(result.cleanupDeleted,true);
    assert.equal(calls.length,2);
    assert.equal(calls[0].body.disable_notification,true);
    assert.match(calls[1].url,/deleteMessage/);
  } finally { restore(); }
});

test("homepage test-drive synthetic CI leads are silent and deleted after delivery", async () => {
  const calls = [];
  const restore = withMockFetch(async (url, options) => {
    calls.push({url:String(url), body:JSON.parse(options.body)});
    if(String(url).includes("/sendMessage")) return new Response(JSON.stringify({ok:true,result:{message_id:102,chat:{id:999}}}), {status:200});
    return new Response(JSON.stringify({ok:true,result:true}), {status:200});
  });
  try {
    const result = await notifyTelegramCrm(
      {TELEGRAM_CRM_BOT_TOKEN:["fixture","token"].join("-"),TELEGRAM_CRM_CHAT_ID:"999"},
      {source:"test-drive",name:"CI-WEB-FORM-456",phone:"0900000000",message:"Lái thử xe"}
    );
    assert.equal(result.sent,true);
    assert.equal(result.synthetic,true);
    assert.equal(result.cleanupDeleted,true);
    assert.equal(calls[0].body.disable_notification,true);
    assert.match(calls[0].body.text,/SOURCE: TEST DRIVE FORM/);
    assert.match(calls[1].url,/deleteMessage/);
  } finally { restore(); }
});

test("AI chat synthetic CRM probes are silent and deleted after delivery", async () => {
  const calls = [];
  const restore = withMockFetch(async (url, options) => {
    calls.push({url:String(url), body:JSON.parse(options.body)});
    if(String(url).includes("/sendMessage")) return new Response(JSON.stringify({ok:true,result:{message_id:103,chat:{id:999}}}), {status:200});
    return new Response(JSON.stringify({ok:true,result:true}), {status:200});
  });
  try {
    const result = await notifyTelegramCrm(
      {TELEGRAM_CRM_BOT_TOKEN:["fixture","token"].join("-"),TELEGRAM_CRM_CHAT_ID:"999"},
      {source:"ai-chat",conversationId:"ci-ai-chat-789",message:"Hotline liên hệ là gì?",reply:"0866 997 891"}
    );
    assert.equal(result.sent,true);
    assert.equal(result.synthetic,true);
    assert.equal(result.cleanupDeleted,true);
    assert.equal(calls[0].body.disable_notification,true);
    assert.match(calls[0].body.text,/SOURCE: WEBSITE AI CHAT/);
    assert.match(calls[1].url,/deleteMessage/);
  } finally { restore(); }
});

test("ordinary CRM notifications are not auto-deleted", async () => {
  const calls = [];
  const restore = withMockFetch(async (url, options) => {
    calls.push({url:String(url), body:JSON.parse(options.body)});
    return new Response(JSON.stringify({ok:true,result:{message_id:104,chat:{id:999}}}), {status:200});
  });
  try {
    const result = await notifyTelegramCrm(
      {TELEGRAM_CRM_BOT_TOKEN:["fixture","token"].join("-"),TELEGRAM_CRM_CHAT_ID:"999"},
      {source:"website-lead",name:"Khách thật",phone:"0909123456",message:"Tư vấn xe"}
    );
    assert.equal(result.sent,true);
    assert.equal(result.synthetic,false);
    assert.equal(result.cleanupDeleted,false);
    assert.equal(calls.length,1);
    assert.equal(calls[0].body.disable_notification,false);
  } finally { restore(); }
});
