import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../src/entry.js";

const origin = "https://phanthuanxtra.com";
const homepage = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const advisorHtml = fs.readFileSync(new URL("../public/trai-nghiem-xe.html", import.meta.url), "utf8");
const entrySource = fs.readFileSync(new URL("../src/entry.js", import.meta.url), "utf8");

test("XTRA homepage uses the exact public extensionless URL", () => {
  assert.match(homepage, /href="\/trai-nghiem-xe"/);
  assert.match(advisorHtml, /rel="canonical" href="https:\/\/phanthuanxtra\.com\/trai-nghiem-xe"/);
  assert.match(advisorHtml, /id="xtra-results"/);
  assert.match(advisorHtml, /src="\/xtra-intelligent-ui\.js"/);
});

test("XTRA extensionless URLs route to actual HTML asset, never an empty fallback", async () => {
  for (const route of ["/trai-nghiem-xe", "/trai-nghiem-xe/"]) {
    const seen = [];
    const env = {
      ASSETS: {
        async fetch(request) {
          const path = new URL(request.url).pathname;
          seen.push(path);
          if (path !== "/trai-nghiem-xe.html") return new Response("Not Found", {status:404});
          return new Response(advisorHtml, {status:200, headers:{"content-type":"text/html"}});
        }
      }
    };
    const response = await worker.fetch(new Request(origin + route), env, {});
    assert.equal(response.status, 200, route);
    assert.deepEqual(seen, ["/trai-nghiem-xe.html"]);
    assert.match(response.headers.get("content-type"), /text\/html; charset=utf-8/);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.match(await response.text(), /XTRA INTELLIGENT UI/);
  }
});

test("extensionless alias stays inside the reviewed static-asset allowlist", () => {
  assert.match(entrySource,/\["\/trai-nghiem-xe", "\/trai-nghiem-xe\.html"\]/);
  assert.match(entrySource,/\["\/trai-nghiem-xe\/", "\/trai-nghiem-xe\.html"\]/);
  assert.doesNotMatch(advisorHtml,/ADMIN_TOKEN|LYLY_BRIDGE_TOKEN|sk-[A-Za-z0-9]/);
});
