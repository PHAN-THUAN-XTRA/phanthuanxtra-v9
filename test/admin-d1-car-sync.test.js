import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
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
