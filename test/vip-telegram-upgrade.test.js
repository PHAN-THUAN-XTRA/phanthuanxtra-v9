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

// Cloudflare's image-to-text binding validates image as an array of byte values.
test("LLaVA fallback sends schema-compatible image bytes after multimodal failures", async () => {
  const seen=[];
  const env={AI:{async run(model,input){seen.push({model,input});if(model.includes("llava"))return {description:JSON.stringify({brand:null,model:null,confidence:0,missing_fields:["brand","model"]})};throw new Error("model unavailable")}}};
  const result=await analyzeVehicleImage(env,new Uint8Array([255,216,255]).buffer,"image/jpeg");
  assert.equal(result._ai_model,"@cf/llava-hf/llava-1.5-7b-hf");
  assert.deepEqual(seen.find(x=>x.model.includes("llava")).input.image,[255,216,255]);
});

test("Vision quota failures are classified as rate limits", async () => {
  const env={AI:{async run(){throw new Error("4006: daily free allocation exhausted")}}};
  await assert.rejects(analyzeVehicleImage(env,new Uint8Array([1]).buffer,"image/jpeg"),error=>error.diagnostics.every(item=>item.code==="RATE_LIMIT"));
});
