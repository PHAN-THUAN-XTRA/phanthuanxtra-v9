import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCarPayload, validCarId } from "../src/vehicle-persistence.js";

test("vehicle id contract", () => {
  assert.equal(validCarId("car-123"), true);
  assert.equal(validCarId("x"), false);
  assert.equal(validCarId("bad id"), false);
});

test("normalizes canonical vehicle payload", () => {
  const result=normalizeCarPayload({brand:" Porsche ",model:" 911 ",status:"AVAILABLE",year:"2025",mileage:"12",price:"1000",features:[" AWD "]});
  assert.equal(result.error, undefined);
  assert.equal(result.value.brand,"Porsche");
  assert.equal(result.value.model,"911");
  assert.equal(result.value.status,"available");
  assert.equal(result.value.year,2025);
  assert.deepEqual(result.value.features,["AWD"]);
});

test("rejects missing identity and invalid status", () => {
  assert.match(normalizeCarPayload({brand:"",model:"911"}).error,/bắt buộc/);
  assert.match(normalizeCarPayload({brand:"Porsche",model:"911",status:"draft"}).error,/status/);
});

test("update preserves existing values", () => {
  const result=normalizeCarPayload({price:200},{brand:"BMW",model:"X7",status:"reserved",price:100,features_json:'["Luxury"]'});
  assert.equal(result.value.brand,"BMW");
  assert.equal(result.value.model,"X7");
  assert.equal(result.value.status,"reserved");
  assert.equal(result.value.price,200);
  assert.deepEqual(result.value.features,["Luxury"]);
});
