import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { handleAppAdmin } from "../src/app-admin.js";
import { issueAdminToken } from "../src/admin-auth.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

// Read-only D1 mock: fail immediately on any SQL that is not SELECT.
function mockD1(amount = 194) {
  const rows = Array.from({ length: amount }, (_, i) => ({
    id: "tg-" + String(i + 1).padStart(3, "0"),
    brand: "ROLLS-ROYCE",
    model: "PHANTOM",
    year: 2009,
    price: 7680000000,
    status: "available",
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
  }
});
