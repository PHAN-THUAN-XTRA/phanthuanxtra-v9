import test from "node:test";
import assert from "node:assert/strict";
import { analyzeVehicleImage, detectVehicleObjects } from "../src/vehicle-ai.js";
import { buildVipReport } from "../src/vip-vehicle-intelligence.js";

test("Scout vision is preferred and observed color and condition reach the report", async () => {
  const calls = [];
  const env = { AI: { async run(model) {
    calls.push(model);
    return { response: JSON.stringify({ brand:"Toyota", model:"Vios", color:"trắng", condition:"trầy cản trước", confidence:0.7, form_state:"uncertain" }) };
  } } };
  const image = await analyzeVehicleImage(env, new Uint8Array([1,2,3]).buffer, "image/jpeg");
  assert.equal(calls[0], "@cf/meta/llama-4-scout-17b-16e-instruct");
  const report = buildVipReport([{type:"vehicle_image",confidence:image.confidence,claims:image}]);
  assert.equal(report.vehicle_identity.color, "trắng");
  assert.equal(report.vehicle_identity.condition, "trầy cản trước");
});

test("Scout failure falls back to Qwen; DETR failure leaves analysis available", async () => {
  const calls = [];
  const env = { AI: { async run(model) {
    calls.push(model);
    if (model.includes("scout") || model.includes("detr")) throw new Error("model unavailable");
    return {response: JSON.stringify({brand:"Honda",model:"City",confidence:0.5})};
  } } };
  const image = await analyzeVehicleImage(env, new Uint8Array([1]).buffer, "image/jpeg");
  assert.equal(image._ai_model, "@cf/qwen/qwen3.8-27b");
  assert.deepEqual(await detectVehicleObjects(env, new Uint8Array([1]).buffer), []);
});
