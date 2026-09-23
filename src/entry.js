import legacy from "./index.js";
import { handleCmsApi } from "./cms.js";
import { handleTelegramApi } from "./telegram.js";
import { handleTelegramIngest, setTelegramWebhook, getTelegramWebhookStatus } from "./telegram-ingest.js";
import { handleMediaApi } from "./media.js";
import { handleAiChat } from "./ai-chat.js";
import { handleTelegramRouter } from "./telegram-router.js";
import { handleVipTelegram, getVipTelegramWebhookStatus, setVipTelegramWebhook } from "./vip-telegram.js";
import { handleTelegramLookup } from "./telegram-lookup.js";
import { handleAppApi } from "./app-api.js";
import { handleAppAdmin } from "./app-admin.js";
import { handleAdminVehiclePipeline } from "./admin-vehicle-pipeline.js";
import { reconcileTelegramNotifications } from "./telegram-notifications.js";
import { handlePublishCore } from "./publish-core.js";

// Keep homepage HTML on the Worker response path so UTF-8 headers are explicit.

const TELEGRAM_WEBHOOK_URL="https://phanthuanxtra.com/api/telegram/webhook";
const TELEGRAM_VIP_WEBHOOK_URL="https://phanthuanxtra.com/api/telegram/vip-webhook";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const adminAssetPath = (() => {
        if (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/admin.html") return "/admin";
        if (url.pathname === "/admin-control" || url.pathname === "/admin-control/" || url.pathname === "/admin-control.html") return "/admin-control";
        if (url.pathname === "/admin-recovery" || url.pathname === "/admin-recovery/" || url.pathname === "/admin-recovery.html") return "/admin-recovery";
        return null;
      })();
      if (adminAssetPath) {
        const assetUrl = new URL(adminAssetPath, request.url);
        const assetHeaders = new Headers(request.headers);
        assetHeaders.set("accept-encoding", "identity");
        assetHeaders.set("cache-control", "no-cache");
        const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET", headers: assetHeaders, cf: { cacheTtl: 0, cacheEverything: false } }));
        const headers = new Headers(assetResponse.headers);
        headers.set("content-type", "text/html; charset=utf-8");
        headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
        headers.delete("location");
        headers.delete("content-encoding");
        headers.delete("content-length");
        return new Response(assetResponse.body, { status: 200, headers });
      }
      const editorialAssets = new Map([
        ["/phan-thuan", "/phan-thuan.html"], ["/phan-thuan/", "/phan-thuan.html"],
        ["/green-energy", "/green-energy.html"], ["/green-energy/", "/green-energy.html"],
        ["/yachts", "/yachts.html"], ["/yachts/", "/yachts.html"],
        ["/business-jets", "/business-jets.html"], ["/business-jets/", "/business-jets.html"]
      ]);
      if (editorialAssets.has(url.pathname)) {
        const assetUrl = new URL(editorialAssets.get(url.pathname), request.url);
        const assetHeaders = new Headers(request.headers);
        assetHeaders.set("accept-encoding", "identity");
        assetHeaders.set("cache-control", "no-cache");
        const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET", headers: assetHeaders, cf: { cacheTtl: 0, cacheEverything: false } }));
        const headers = new Headers(assetResponse.headers);
        headers.set("content-type", "text/html; charset=utf-8");
        headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
        headers.delete("content-encoding"); headers.delete("content-length"); headers.delete("location");
        // Decode asset bytes as UTF-8 and re-encode the string explicitly. This prevents
        // upstream/static charset ambiguity from turning Vietnamese into mojibake.
        const html = new TextDecoder("utf-8", { fatal: true }).decode(await assetResponse.arrayBuffer());
        return new Response(html, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
      }
      if (url.pathname === "/" || url.pathname === "/home" || url.pathname === "/home/") {
        const assetUrl = new URL("/index.html", request.url);
        const assetHeaders = new Headers(request.headers);
        assetHeaders.set("accept-encoding", "identity");
        assetHeaders.set("cache-control", "no-cache");
        const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET", headers: assetHeaders, cf: { cacheTtl: 0, cacheEverything: false } }));
        const headers = new Headers(assetResponse.headers);
        headers.set("content-type", "text/html; charset=utf-8");
        headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
        headers.delete("content-encoding");
        headers.delete("content-length");
        return new Response(assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
      }
      const publishCoreResponse = await handlePublishCore(request, env);
      if (publishCoreResponse) return publishCoreResponse;
      const aiChatResponse = await handleAiChat(request, env);
      if (aiChatResponse) return aiChatResponse;
      const adminPipeline = await handleAdminVehiclePipeline(request, env);
      if (adminPipeline instanceof Response) return adminPipeline;
      if (adminPipeline instanceof Request) request = adminPipeline;
      const appAdminResponse = await handleAppAdmin(request, env);
      if (appAdminResponse) return appAdminResponse;
      const appApiResponse = await handleAppApi(request, env);
      if (appApiResponse) return appApiResponse;
      const vipTelegramResponse = await handleVipTelegram(request, env);
      if (vipTelegramResponse) return vipTelegramResponse;
      const lookupTelegramResponse = await handleTelegramLookup(request, env);
      if (lookupTelegramResponse) return lookupTelegramResponse;
      const telegramRouterResponse = await handleTelegramRouter(request, env, ctx);
      if (telegramRouterResponse) return telegramRouterResponse;
      const ingestResponse = await handleTelegramIngest(request, env, ctx);
      if (ingestResponse) return ingestResponse;
      const mediaResponse = await handleMediaApi(request, env);
      if (mediaResponse) return mediaResponse;
      const telegramResponse = await handleTelegramApi(request, env);
      if (telegramResponse) return telegramResponse;
      const cmsResponse = await handleCmsApi(request, env);
      if (cmsResponse) return cmsResponse;
      return legacy.fetch(request, env, ctx);
    } catch (error) {
      console.error("telegram_or_worker_request", String(error?.message || error));
      return new Response(JSON.stringify({ok:false,error:"Internal Server Error"}),{status:500,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
    }
  },
  async scheduled(controller, env, ctx) {
    try {
      const status=await getTelegramWebhookStatus(env,TELEGRAM_WEBHOOK_URL);
      console.log("telegram_webhook_status",JSON.stringify(status));
      if(!status.ok||!status.url_matches_expected){
        const result=await setTelegramWebhook(env,TELEGRAM_WEBHOOK_URL);
        console.log("telegram_webhook_self_heal_ok",JSON.stringify({url:TELEGRAM_WEBHOOK_URL,result,reason:status.ok?"url_mismatch":"status_unavailable"}));
        const verified=await getTelegramWebhookStatus(env,TELEGRAM_WEBHOOK_URL);
        console.log("telegram_webhook_post_heal_status",JSON.stringify(verified));
      }
    } catch (error) { console.error("telegram_webhook_self_heal_failed",String(error?.message||error)); }
    try {
      const vipStatus=await getVipTelegramWebhookStatus(env,TELEGRAM_VIP_WEBHOOK_URL);
      console.log("telegram_vip_webhook_status",JSON.stringify(vipStatus));
      if(!vipStatus.ok||!vipStatus.url_matches_expected){
        const result=await setVipTelegramWebhook(env,TELEGRAM_VIP_WEBHOOK_URL);
        console.log("telegram_vip_webhook_self_heal_ok",JSON.stringify({url:TELEGRAM_VIP_WEBHOOK_URL,result,reason:vipStatus.ok?"url_mismatch":"status_unavailable"}));
        const verified=await getVipTelegramWebhookStatus(env,TELEGRAM_VIP_WEBHOOK_URL);
        console.log("telegram_vip_webhook_post_heal_status",JSON.stringify(verified));
      }
    } catch (error) { console.error("telegram_vip_webhook_self_heal_failed",String(error?.message||error)); }
    try {
      const result=await reconcileTelegramNotifications(env);
      console.log("telegram_notifications_reconcile",JSON.stringify(result));
    } catch (error) { console.error("telegram_notifications_reconcile_failed",String(error?.message||error)); }
  }
};
