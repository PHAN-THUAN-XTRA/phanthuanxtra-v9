import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = "https://phanthuanxtra.com";
const URL = BASE + "/car.html?id=tg-786&lightbox_audit=" + Date.now();
async function awaitLiveEnhancement() {
  for(let attempt=1;attempt<=36;attempt++){
    try{
      const res=await fetch(BASE+"/image-viewer.js?live_fix="+Date.now(),{
        headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(12000)
      });
      const body=await res.text();
      if(res.ok && body.includes("enhanceVehicleGallery")) {
        console.log("PASS: corrected image-viewer.js is deployed (attempt "+attempt+")");
        return;
      }
      console.log("Waiting for patched production image-viewer.js; HTTP "+res.status+", attempt "+attempt);
    }catch(error){console.log("Live asset probe retry "+attempt+": "+String(error.message||error).slice(0,160));}
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  throw Error("Corrected image-viewer.js was not deployed within the acceptance window");
}
await awaitLiveEnhancement();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const hits = [];
const result = {url:URL,checks:[],responses:hits};

function check(name,condition,message){
  assert.ok(condition,message || name);
  result.checks.push(name);
  console.log("PASS: " + name);
}
async function exercise(context,label){
  const page=await context.newPage();
  page.on("response",r=>{
    try {
      if(new URL(r.url()).hostname==="phanthuanxtra.com" &&
        (/image-viewer|\/api\/cars|\/media\/vehicles|\/car\.html/.test(r.url())) &&
        (r.status()>=400||/image-viewer/.test(r.url())))
        hits.push({status:r.status(),url:r.url().slice(0,230)});
    } catch {}
  });
  page.on("pageerror",error=>console.error("BROWSER_JS_ERROR "+label+": "+error.message));
  try {
    const response=await page.goto(URL,{waitUntil:"domcontentloaded",timeout:60000});
    check(label+" page HTTP 200",response?.status()===200,"Vehicle page returned HTTP "+response?.status());
    await page.locator(".vehicle-gallery-grid a").first().waitFor({timeout:30000});
    const diag=await page.evaluate(()=>({
      vehicleTitle:document.querySelector(".detail-info h1")?.textContent,
      galleryHeading:document.querySelector(".vehicle-gallery h2")?.textContent,
      galleryLink:document.querySelector(".vehicle-gallery-grid a")?.outerHTML.slice(0,350),
      viewerScript:!!document.querySelector('script[src="/image-viewer.js"]'),
      viewerCss:!!document.querySelector('link[href="/image-viewer.css"]'),
      viewerAttributeCount:document.querySelectorAll('a[data-ptx-image-viewer]').length,
      documentHTMLLength:document.documentElement.outerHTML.length
    }));
    console.log("PROD_DOM_DIAGNOSTIC "+JSON.stringify(diag));
    const scriptProbe=await page.request.get("https://phanthuanxtra.com/image-viewer.js?audit="+Date.now());
    console.log("PROD_VIEWER_SCRIPT_STATUS "+scriptProbe.status()+" LEN "+(await scriptProbe.text()).length);
    await page.locator(".vehicle-gallery-grid a[data-ptx-image-viewer]").first().waitFor({timeout:8000});
    const tiles=page.locator(".vehicle-gallery-grid a[data-ptx-image-viewer]");
    check(label+" 24 gallery images",await tiles.count()===24,"Vehicle gallery must retain exactly 24 images");
    check(label+" hero clickable",await page.locator(".vehicle-cover-zoom[data-ptx-image-viewer]").count()===1);
    const js=await page.evaluate(()=>typeof window !== "undefined" && document.querySelector('script[src="/image-viewer.js"]')!==null);
    check(label+" viewer script linked",js);
    await page.locator(".vehicle-cover-zoom").click();
    await page.locator(".ptx-image-viewer:not([hidden])").waitFor({timeout:15000});
    check(label+" click hero opens modal",(await page.locator(".ptx-image-viewer__counter").innerText())==="1 / 24");
    check(label+" click modal has photo",await page.locator(".ptx-image-viewer__photo").getAttribute("src")!==null);
    await page.keyboard.press("ArrowRight");
    check(label+" right arrow advances",(await page.locator(".ptx-image-viewer__counter").innerText())==="2 / 24");
    await page.keyboard.press("Escape");
    check(label+" Escape closes modal",await page.locator(".ptx-image-viewer[hidden]").count()===1);
    await tiles.nth(21).click();
    check(label+" click photo 22 opens correct photo",(await page.locator(".ptx-image-viewer__counter").innerText())==="22 / 24");
    check(label+" modal photo URL matches tile",await page.locator(".ptx-image-viewer__photo").getAttribute("src") === await tiles.nth(21).getAttribute("href"));
    const loaded=await page.locator(".ptx-image-viewer__photo").evaluate(async image=>{
      if(image.complete)return image.naturalWidth>0;
      return new Promise(resolve=>{
        image.addEventListener("load",()=>resolve(image.naturalWidth>0),{once:true});
        image.addEventListener("error",()=>resolve(false),{once:true});
        setTimeout(()=>resolve(false),12000);
      });
    });
    check(label+" image bytes decode in browser",loaded,"Fullscreen photo failed to load or decode");
    await page.getByRole("button",{name:"Đóng ảnh phóng to"}).click();
    check(label+" close button works",await page.locator(".ptx-image-viewer[hidden]").count()===1);
  } catch(error) {
    console.error("FAILED "+label+": "+String(error?.stack||error));
    await mkdir("artifacts",{recursive:true});
    await page.screenshot({path:"artifacts/tg786-"+label+".png",fullPage:true,timeout:15000}).catch(()=>{});
    throw error;
  } finally{await page.close()}
}
try {
  await exercise(await browser.newContext({viewport:{width:1365,height:900}}),"desktop");
  await exercise(await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),"mobile");
  console.log("SUCCESS PUBLIC HUMMER VIEWER CHECKS: "+result.checks.length);
  console.log("RESOURCE STATUS: "+JSON.stringify(hits));
}finally{await browser.close()}
