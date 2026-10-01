import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCarPayload, setCarVisibility } from "../src/vehicle-persistence.js";

test("partial status update preserves nullable mileage", () => {
  const existing = {
    brand: "AUDI",
    model: "Q7 3.0 TFSI",
    year: 2017,
    mileage: null,
    price: 1050000000,
    fuel: "",
    category: "suv",
    color: "",
    status: "available",
    description: "test",
    features_json: "[]",
    featured: 0,
    cover_image: "https://example.com/cover.webp"
  };

  const parsed = normalizeCarPayload({ status: "hidden" }, existing);
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value.status, "hidden");
  assert.equal(parsed.value.mileage, null);
});

test("explicit numeric mileage is still normalized", () => {
  const existing = { brand: "AUDI", model: "Q7", mileage: null, status: "available" };
  const parsed = normalizeCarPayload({ mileage: "12345" }, existing);
  assert.equal(parsed.value.mileage, 12345);
});

test("visibility action updates only status and writes audit", async () => {
  const calls = [];
  const car = { id: "tg-652", brand: "AUDI", model: "Q7", status: "available" };
  const db = {
    prepare(sql) {
      calls.push(sql);
      return {
        bind(...args) {
          return {
            async first() { return sql.startsWith("SELECT") ? { ...car } : null; },
            async run() { return { meta: { changes: 1 }, args }; }
          };
        }
      };
    }
  };

  const result = await setCarVisibility(db, "tg-652", false, { actor: "test" });
  assert.equal(result.ok, true);
  assert.equal(result.visibility, "hidden");
  assert.equal(result.car.status, "hidden");
  assert.ok(calls.some(sql => sql.startsWith("UPDATE cars SET status=")));
  assert.ok(calls.some(sql => sql.startsWith("INSERT INTO cms_audit_log")));
  assert.equal(calls.some(sql => sql.includes("car_images")), false);
});
