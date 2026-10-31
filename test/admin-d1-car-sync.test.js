import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { handleAppAdmin } from "../src/app-admin.js";
import { issueAdminToken } from "../src/admin-auth.js";
import { handleTelegramMiniAppApi } from "../src/telegram-mini-app.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

// Read-only D1 mock: fail immediately on any SQL that is not SELECT.
function mockD1(amount = 194) {
  const rows = Array.from({ length: amount }, (_, i) => ({
    id: i === amount - 1 ? "tg-811" : "tg-" + String(i + 1).padStart(3, "0"),
    brand: "ROLLS-ROYCE",
    model: "PHANTOM",
    year: 2009,
    price: 7680000000,
    status: i < 7 || i === amount - 1 ? "available" : "hidden",
    featured: 0,
    created_at: "2026-10-31"
  }));
  let reads = 0;
  return {
    get reads() { return reads; },
    prepare(sql) {
      if (!/^SELECT\s/i.test(sql)) throw new Error("Unexpected D1 mutation: " + sql);
      return {
        bind(...args) {
          return {
            async first(key) {
              reads++;
              assert.match(sql, /^SELECT COUNT\(\*\) n FROM cars/);
              assert.equal(key, "n");
              return rows.length;
            },
            async all() {
              reads++;
              if (sql.includes("FROM car_images")) return { results: [] };
              if (sql.startsWith("SELECT * FROM cars ORDER BY")) return { results: rows.slice(0, 300) };
              assert.match(sql, /^SELECT \* FROM cars WHERE/);
              const limit = args[args.length - 2];
              const offset = args[args.length - 1];
              return { results: rows.slice(offset, offset + limit) };
            }
          };
        }
      };
    }
  };
}

const base = "https://phanthuanxtra.com";

test("Admin vehicle endpoint refuses unauthenticated reads without touching D1", async () => {
  const db = mockD1();
  const env = { DB: db, ADMIN_TOKEN: webcrypto.randomUUID() };
  const result = await handleAppAdmin(new Request(base + "/api/admin/cars?limit=50"), env);
  assert.equal(result.status, 401);
  assert.equal(db.reads, 0);
});

test("Admin reads all 194 D1 cars with stable authenticated pagination", async () => {
  const db = mockD1(194);
  const env = { DB: db, ADMIN_TOKEN: webcrypto.randomUUID() };
  const token = await issueAdminToken(env);
  const ids = new Set();
  for (const offset of [0, 50, 100, 150]) {
    const request = new Request(base + "/api/admin/cars?limit=50&offset=" + offset, {
      headers: { Authorization: "Bearer " + token }
    });
    const response = await handleAppAdmin(request, env);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.total, 194);
    assert.equal(payload.limit, 50);
    assert.equal(payload.offset, offset);
    assert.equal(payload.cars.length, Math.min(50, 194 - offset));
    for (const car of payload.cars) {
      assert.equal(ids.has(car.id), false, "No duplicated D1 car ids");
      ids.add(car.id);
    }
  }
  assert.equal(ids.size, 194);
});

test("Both Admin URLs verify every car page rather than presenting a partial inventory", () => {
  for (const file of ["public/admin-control", "public/admin-control.html"]) {
    const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    assert.match(source, /\/api\/admin\/cars\?limit=/);
    assert.match(source, /all\.length!==expected/);
    assert.match(source, /ids\.has\(car\.id\)/);
    assert.match(source, /id="carSync"/);
    assert.match(source, /<option value="hidden">hidden<\/option>/);
  }
});

async function signTelegramOwnerInitData(botToken, ownerId) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AA-offline-sync",
    user: JSON.stringify({ id: ownerId, first_name: "Fixture" })
  });
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value).join("\n");
  const sign = async (keyBytes, value) => {
    const key = await webcrypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  };
  const secret = await sign(new TextEncoder().encode("WebAppData"), botToken);
  const signature = await sign(secret, check);
  params.set("hash", Array.from(signature, x => x.toString(16).padStart(2, "0")).join(""));
  return params.toString();
}

test("Admin and Telegram signed Mini App read exactly the same D1 vehicles including tg-811", async () => {
  const db = mockD1(194);
  const ownerId = 123456789;
  const env = {
    DB: db,
    ADMIN_TOKEN: webcrypto.randomUUID(),
    TELEGRAM_AUTO_BOT_TOKEN: webcrypto.randomUUID(),
    TELEGRAM_AUTO_PUBLISH_CHAT_IDS: String(ownerId)
  };
  const adminToken = await issueAdminToken(env);
  const adminCars = [];
  for (const offset of [0, 50, 100, 150]) {
    const response = await handleAppAdmin(new Request(base + "/api/admin/cars?limit=50&offset=" + offset, {
      headers: { Authorization: "Bearer " + adminToken }
    }), env);
    assert.equal(response.status, 200);
    adminCars.push(...(await response.json()).cars);
  }
  const signed = await signTelegramOwnerInitData(env.TELEGRAM_AUTO_BOT_TOKEN, ownerId);
  const telegramResponse = await handleTelegramMiniAppApi(
    new Request(base + "/api/telegram/mini/v1/cars", { headers: { "X-Telegram-Init-Data": signed } }),
    env
  );
  assert.equal(telegramResponse.status, 200);
  const telegramCars = (await telegramResponse.json()).cars;
  assert.equal(adminCars.length, 194);
  assert.equal(telegramCars.length, 194);
  assert.equal(adminCars.filter(c => c.status === "available").length, 8);
  assert.equal(adminCars.filter(c => c.status === "hidden").length, 186);
  assert.equal(telegramCars.filter(c => c.status === "hidden").length, 186);
  assert.deepEqual(adminCars.map(x => x.id).sort(), telegramCars.map(x => x.id).sort());
  const phantom = adminCars.find(x => x.id === "tg-811");
  assert.ok(phantom);
  assert.equal(phantom.price, 7680000000);
  assert.equal(telegramCars.find(x => x.id === "tg-811").price, phantom.price);
});

test("Admin never claims 194 vehicles when D1 contains only one fixture row", async () => {
  const db = mockD1(1);
  const env = { DB: db, ADMIN_TOKEN: webcrypto.randomUUID() };
  const token = await issueAdminToken(env);
  const response = await handleAppAdmin(new Request(base + "/api/admin/cars?limit=50&offset=0", {
    headers: { Authorization: "Bearer " + token }
  }), env);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.total, 1);
  assert.equal(payload.cars.length, 1);
});


test("Actual Admin loadCars function hydrates 194 rows without losing hidden vehicles", async () => {
  for (const file of ["public/admin-control", "public/admin-control.html"]) {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const start = html.indexOf("let carsLoading=false;");
    const end = html.indexOf("function renderCars()", start);
    assert.ok(start >= 0 && end > start, "loadCars source must be present");
    const source = html.slice(start, end);
    const records = Array.from({length: 194}, (_, i) => ({
      id: i === 193 ? "tg-811" : "tg-" + String(i + 1).padStart(3, "0"),
      status: i < 7 || i === 193 ? "available" : "hidden",
      price: i === 193 ? 7680000000 : 1
    }));
    const calls = [];
    const sync = {textContent: ""};
    const table = {replaceChildren() {}, innerHTML: ""};
    const context = {
      cars: [],
      api: async url => {
        const u = new URL(url, base);
        const offset = Number(u.searchParams.get("offset"));
        const limit = Number(u.searchParams.get("limit"));
        calls.push({offset, limit});
        return {cars: records.slice(offset, offset + limit), total: records.length, limit, offset};
      },
      $: selector => selector === "#carTable" ? table : null,
      document: {
        getElementById: id => id === "carSync" ? sync : null,
        createElement: () => ({className:"", textContent:""})
      },
      renderCars: () => {context.renderedCars = context.cars.length; }
    };
    vm.runInNewContext(source + "\nglobalThis.__loadCars=loadCars;", context);
    await context.__loadCars();
    assert.equal(context.cars.length, 194);
    assert.equal(context.renderedCars, 194);
    assert.equal(context.cars.filter(car => car.status === "hidden").length, 186);
    assert.equal(context.cars.find(car => car.id === "tg-811").price, 7680000000);
    assert.equal(sync.textContent, "D1: 194/194 xe đã đối chiếu");
    assert.deepEqual(calls.map(x => x.offset), [0, 50, 100, 150]);
    assert.ok(calls.every(x => x.limit === 50));
  }
});


test("Postdeploy inventory verifier is main-only and read-only", () => {
  const source = readFileSync(new URL("../.github/workflows/admin-inventory-postdeploy.yml", import.meta.url), "utf8");
  assert.match(source, /workflow_run:/);
  assert.match(source, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(source, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(source, /contents: read/);
  assert.match(source, /\/api\/admin\/cars\?limit=50&offset=/);
  assert.match(source, /ADMIN_INVENTORY_POSTDEPLOY/);
  assert.doesNotMatch(source, /\bwrangler\s+(?:deploy|d1|secret|publish)\b/i);
  assert.doesNotMatch(source, /(?:DROP|DELETE|UPDATE|INSERT|ALTER)\s+(?:TABLE|FROM|INTO|cars|car_images)\b/i);
});


test("Production deploy purges both Admin Control routes so repaired gallery is not stale", () => {
  const source = readFileSync(new URL("../.github/workflows/deploy-cloudflare.yml", import.meta.url), "utf8");
  assert.match(source, /Purge changed Admin HTML cache/);
  assert.match(source, /https:\/\/phanthuanxtra\.com\/admin-control"/);
  assert.match(source, /https:\/\/phanthuanxtra\.com\/admin-control\.html"/);
});


test("Native Admin HTML renders all 194 Telegram-truth cars without querySelector.forEach crash", () => {
  const html=readFileSync(new URL("../public/admin-control.html",import.meta.url),"utf8");
  const start=html.indexOf("function renderCars(){");
  const end=html.indexOf("async function setVisibility(",start);
  assert.ok(start>=0&&end>start);
  const renderer=html.slice(start,end);
  assert.doesNotMatch(renderer, /querySelector\([^)]*\)\.forEach\s*\(/);
  assert.doesNotMatch(renderer, /\$\('#carTable \[data-edit\]'\)\.forEach/);
  assert.doesNotMatch(renderer, /renderCarsBase/);
  const createNode=(tag)=>({
    tagName:tag,children:[],dataset:{},textContent:"",value:"",
    append(...items){this.children.push(...items)},
    replaceChildren(...items){this.children=[...items]}
  });
  const root=createNode("div"),search={value:""},statusFilter={value:""};
  const records=Array.from({length:194},(_,i)=>({
    id:i===193?"tg-811":"tg-"+String(i+1).padStart(3,"0"),
    brand:"ROLLS-ROYCE",model:"PHANTOM",year:2009,mileage:1,
    status:i<7||i===193?"available":"hidden",price:7680000000
  }));
  const context={
    cars:records,
    $:selector=>({"#carTable":root,"#carQ":search,"#carFilter":statusFilter}[selector]||null),
    document:{
      createElement:createNode,
      createTextNode:text=>({textContent:String(text)})
    },
    editCar(){},publishTelegram(){},removeCar(){},setVisibility(){}
  };
  vm.runInNewContext(renderer+";globalThis.testRenderCars=renderCars;",context);
  context.testRenderCars();
  let table=root.children[0];
  assert.equal(table.tagName,"table");
  assert.equal(table.children[1].children.length,194);
  const actions=table.children[1].children[193].children[4].children;
  assert.equal(actions.filter(x=>x.tagName==="button").length,4);
  assert.equal(actions.find(x=>x.dataset?.visibility==="tg-811")?.textContent,"Ẩn xe");
  statusFilter.value="hidden";
  context.testRenderCars();
  table=root.children[0];
  assert.equal(table.children[1].children.length,186);
  assert.equal(table.children[1].children[0].children[4].children.find(x=>x.dataset?.visibility)?.textContent,"Hiện lại");
});
