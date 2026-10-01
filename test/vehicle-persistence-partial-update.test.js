import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCarPayload } from "../src/vehicle-persistence.js";

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
