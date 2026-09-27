import test from "node:test";
import assert from "node:assert/strict";
import { analyzeVehicleImage } from "../src/vehicle-ai.js";

test("daily Workers AI quota stops vision fallback after one request", async () => {
  const models = [];
  const env = { AI: { run: async model => {
    models.push(model);
    throw new Error("4006: you have used up your daily free allocation of 10,000 neurons");
  } } };
  await assert.rejects(
    analyzeVehicleImage(env, new Uint8Array([1, 2, 3]), "image/jpeg"),
    error => error.message === "Workers AI daily allocation exhausted"
      && error.diagnostics?.length === 1
      && error.diagnostics[0].code === "RATE_LIMIT"
  );
  assert.deepEqual(models, ["@cf/meta/llama-4-scout-17b-16e-instruct"]);
});
