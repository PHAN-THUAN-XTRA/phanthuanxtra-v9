import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminVehiclePipeline, isTrusted } from "../src/admin-vehicle-pipeline.js";
import { issueAdminToken, verifyAdminToken } from "../src/admin-auth.js";

const env = { ADMIN_TOKEN: "unit-test-admin-secret" };

async function authHeader() {
  const token = await issueAdminToken(env);
  return { Authorization: `Bearer ${token}` };
}

test("trusted PT Xtra publish artifacts are recognized", () => {
  assert.equal(isTrusted("https://phanthuanxtra.com/media/vehicles/publish-inbox-12-abcd.jpg"), true);
  assert.equal(isTrusted("https://phanthuanxtra.com/media/vehicles/publish-admin-lx600-abc.jpg"), true);
  assert.equal(isTrusted("https://example.com/car.jpg"), false);
});

test("valid admin session is accepted", async () => {
  const headers = await authHeader();
  const request = new Request("https://phanthuanxtra.com/api/admin/cars", { method: "POST", headers });
  const result = await verifyAdminToken(request, env);
  assert.equal(result.ok, true);
});

test("random bearer token is rejected before any admin operation", async () => {
  const request = new Request("https://phanthuanxtra.com/api/admin/cars", {
    method: "POST",
    headers: { Authorization: "Bearer random-not-a-session", "content-type": "application/json" },
    body: JSON.stringify({ id: "lx600", brand: "Lexus", model: "LX600", images: ["https://example.com/car.jpg"] })
  });
  const response = await handleAdminVehiclePipeline(request, env);
  assert.equal(response.status, 401);
});

test("Admin publish is blocked when no images are supplied", async () => {
  const headers = await authHeader();
  headers["content-type"] = "application/json";
  const request = new Request("https://phanthuanxtra.com/api/admin/cars", {
    method: "POST",
    headers,
    body: JSON.stringify({ id: "lx600", brand: "Lexus", model: "LX600" })
  });
  const response = await handleAdminVehiclePipeline(request, env);
  assert.equal(response.status, 400);
});


test("Admin trusted-media simulation preserves owner fields and makes first image the cover", async () => {
  const headers = await authHeader();
  headers["content-type"] = "application/json";
  const owner = {
    id: "sim-owner-car",
    brand: "Porsche",
    model: "718 Boxster",
    year: 2024,
    mileage: 1100,
    price: 4780000000,
    description: "Nội dung owner giữ nguyên.",
    images: [
      "https://phanthuanxtra.com/media/vehicles/publish-admin-sim-owner-car-cover.jpg",
      "https://phanthuanxtra.com/media/vehicles/publish-admin-sim-owner-car-2.jpg"
    ]
  };
  const transformed = await handleAdminVehiclePipeline(new Request("https://phanthuanxtra.com/api/admin/cars", {
    method: "POST", headers, body: JSON.stringify(owner)
  }), env);
  assert.ok(transformed instanceof Request);
  const body = await transformed.json();
  assert.equal(body.brand, owner.brand);
  assert.equal(body.model, owner.model);
  assert.equal(body.year, owner.year);
  assert.equal(body.mileage, owner.mileage);
  assert.equal(body.price, owner.price);
  assert.equal(body.description, owner.description);
  assert.equal(body.images.length, 2);
  assert.equal(body.images[0].sort_order, 0);
  assert.equal(body.images[0].is_cover, true);
  assert.equal(body.images[1].is_cover, false);
  assert.equal(body.cover_image, owner.images[0]);
});

test("Admin pipeline failure is fail-closed and never returns a writable request", async t => {
  const headers = await authHeader();
  headers["content-type"] = "application/json";
  t.mock.method(globalThis, "fetch", async () => new Response("not image", {
    status: 200, headers: {"content-type":"text/plain"}
  }));
  const response = await handleAdminVehiclePipeline(new Request("https://phanthuanxtra.com/api/admin/cars", {
    method: "POST", headers,
    body: JSON.stringify({id:"sim-fail",brand:"Lexus",model:"LX600",images:["https://example.com/not-image"]})
  }), env);
  assert.ok(response instanceof Response);
  assert.equal(response.status, 422);
});
