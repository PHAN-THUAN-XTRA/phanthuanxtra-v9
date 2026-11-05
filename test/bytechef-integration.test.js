import test from "node:test";
import assert from "node:assert/strict";
import { emitVehicleEvent } from "../integrations/bytechef/emitter.mjs";

const input = {
  enabled: true,
  webhookUrl: "https://example.org/bytechef-hook",
  csrfToken: "test-csrf-token-at-least-24-chars",
  event: "vehicle.review_requested",
  vehicleId: "tg-811",
  correlationId: "test-123",
};

test("opt-in disabled means zero requests", async () => {
  let calls = 0;
  assert.deepEqual(await emitVehicleEvent({ ...input, enabled: false, fetchImpl: async () => { calls++; } }), { status: "disabled" });
  assert.equal(calls, 0);
});

test("POST uses validated trigger CSRF header and minimal event envelope", async () => {
  let captured;
  const result = await emitVehicleEvent({ ...input, fetchImpl: async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200 };
  } });
  assert.deepEqual(result, { status: "accepted", httpStatus: 200 });
  assert.equal(captured.url, input.webhookUrl);
  assert.equal(captured.options.redirect, "error");
  assert.equal(captured.options.headers["X-Csrf-Token"], input.csrfToken);
  assert.deepEqual(JSON.parse(captured.options.body), {
    schema: "phanthuanxtra.bytechef.event.v1",
    event: input.event,
    vehicleId: input.vehicleId,
    correlationId: input.correlationId,
  });
});

test("invalid events, IDs and unsafe endpoints fail before sending", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return { ok: true, status: 200 }; };
  for (const bad of [
    { event: "vehicle.delete" },
    { vehicleId: "user@example.com" },
    { correlationId: "../secret" },
    { webhookUrl: "http://example.org/hook" },
    { webhookUrl: "https://user:pass@example.org/hook" },
    { csrfToken: "short" },
  ]) await assert.rejects(emitVehicleEvent({ ...input, ...bad, fetchImpl }), TypeError);
  assert.equal(calls, 0);
});

test("non-2xx receipt is failure, without retry", async () => {
  let calls = 0;
  const result = await emitVehicleEvent({ ...input, fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } });
  assert.deepEqual(result, { status: "failed", httpStatus: 503 });
  assert.equal(calls, 1);
});
