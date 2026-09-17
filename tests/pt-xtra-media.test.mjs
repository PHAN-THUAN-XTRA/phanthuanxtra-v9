import test from "node:test";
import assert from "node:assert/strict";
import { handleMediaApi } from "../src/media.js";

function mockEnv() {
  const calls = [];
  const objects = new Map([["vehicles/test.jpg", { body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2, 3])); c.close(); } }), httpEtag: "etag-test", writeHttpMetadata(headers) { headers.set("content-type", "image/jpeg"); } }]]);
  const env = {
    ADMIN_TOKEN: "test-admin-token",
    MEDIA: {
      async get(key) {
        const object = objects.get(key);
        return object || null;
      },
      async delete(key) {
        calls.push(["delete", key]);
        objects.delete(key);
      }
    },
    ASSETS: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, "/branding/pt-xtra-plate.svg");
        return new Response("<svg>PT Xtra</svg>", { headers: { "content-type": "image/svg+xml" } });
      }
    },
    IMAGES: {
      input(body) {
        const chain = {
          transform(options) { calls.push(["transform", options]); return chain; },
          draw(overlay, options) { calls.push(["draw", options, overlay]); return chain; },
          output(options) { calls.push(["output", options]); return chain; },
          response() { return new Response("BRANDED", { status: 200, headers: { "content-type": "image/jpeg" } }); }
        };
        calls.push(["input", body]);
        return chain;
      }
    }
  };
  return { env, calls };
}

test("PT Xtra branding query applies the display plate overlay", async () => {
  const { env, calls } = mockEnv();
  const response = await handleMediaApi(new Request("https://phanthuanxtra.com/media/vehicles/test.jpg?branding=pt-xtra"), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "BRANDED");
  assert.ok(calls.some(([name]) => name === "draw"));
  assert.deepEqual(calls.find(([name]) => name === "output")[1], { format: "image/jpeg", quality: 90 });
});

test("normal media delivery remains unchanged without branding query", async () => {
  const { env, calls } = mockEnv();
  const response = await handleMediaApi(new Request("https://phanthuanxtra.com/media/vehicles/test.jpg"), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(calls.length, 0);
});

test("media delete requires the existing admin bearer token", async () => {
  const { env, calls } = mockEnv();
  const unauthorized = await handleMediaApi(new Request("https://phanthuanxtra.com/media/vehicles/test.jpg", { method: "DELETE" }), env);
  assert.equal(unauthorized.status, 401);
  assert.equal(calls.length, 0);
  const deleted = await handleMediaApi(new Request("https://phanthuanxtra.com/media/vehicles/test.jpg", { method: "DELETE", headers: { Authorization: "Bearer test-admin-token" } }), env);
  assert.equal(deleted.status, 200);
  assert.deepEqual(calls, [["delete", "vehicles/test.jpg"]]);
  const missing = await handleMediaApi(new Request("https://phanthuanxtra.com/media/vehicles/test.jpg"), env);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { ok: false, error: "Not Found" });
});
