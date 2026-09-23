const schema = {
  type: "object",
  properties: {
    brand: { type: ["string", "null"] },
    model: { type: ["string", "null"] },
    year: { type: ["integer", "null"] },
    mileage: { type: ["integer", "null"] },
    price: { type: ["integer", "null"] },
    fuel: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
    color: { type: ["string", "null"] },
    origin: { type: ["string", "null"] },
    origin_country: { type: ["string", "null"] },
    form_state: { type: "string", enum: ["original","facelift","up_form","modified","uncertain"] },
    form_notes: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    features: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    missing_fields: { type: "array", items: { type: "string" } },
    plate_bbox: { type: ["object", "null"], properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["x","y","width","height"] }
  },
  required: ["brand","model","year","mileage","price","fuel","category","color","origin","origin_country","form_state","form_notes","description","features","confidence","missing_fields","plate_bbox"]
};

function dataUrl(contentType, bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  return `data:${contentType || "image/jpeg"};base64,${btoa(binary)}`;
}

function parseResult(result) {
  if (result && typeof result.response === "object" && !Array.isArray(result.response)) return result.response;
  const choiceContent = result?.choices?.[0]?.message?.content;
  const text = typeof result === "string"
    ? result
    : typeof result?.response === "string"
      ? result.response
      : typeof choiceContent === "string"
        ? choiceContent
        : null;
  if (!text) throw new Error("Workers AI returned no response");
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response is not valid JSON");
    return JSON.parse(match[0]);
  }
}

function classifyError(error) {
  const message = String(error?.message || error).toLowerCase();
  if (message.includes("license") || message.includes("agree") || message.includes("acceptable use")) return "LICENSE_REQUIRED";
  if (message.includes("rate") || message.includes("7505") || message.includes("quota")) return "RATE_LIMIT";
  if (message.includes("7504") || message.includes("validation") || message.includes("invalid") || message.includes("schema")) return "VALIDATION";
  if (message.includes("7502") || message.includes("model not found")) return "MODEL_NOT_FOUND";
  if (message.includes("busy") || message.includes("overload") || message.includes("capacity")) return "BUSY";
  if (message.includes("timeout") || message.includes("timed out")) return "TIMEOUT";
  if (message.includes("json") || message.includes("no response")) return "PARSE";
  return "UNKNOWN";
}

function recordFailure(errors, model, error) {
  errors.push({ model, code: classifyError(error) });
}

export async function analyzeVehicleImage(env, fileBytes, contentType, caption = "") {
  if (!env.AI) throw new Error("Workers AI binding AI is not configured");
  const prompt = `Bạn là bộ phận nhập kho xe của Phan Thuần Xtra. Chỉ ghi dữ kiện nhìn thấy hoặc được cung cấp rõ ràng; không bịa. Không suy đoán năm sản xuất, ODO, giá, phiên bản, động cơ, option, màu hoặc xuất xứ. Nếu không đủ bằng chứng trả null và thêm trường vào missing_fields. origin/origin_country chỉ ghi khi có bằng chứng rõ từ caption, giấy tờ hoặc dữ kiện nhận dạng đáng tin cậy. Phân biệt form hiện tại với xe gốc: form_state=facelift nếu ngoại hình có dấu hiệu facelift nhưng không coi facelift là năm sản xuất; up_form nếu đã đổi ngoại hình sang form đời mới; modified nếu độ/chỉnh sửa; original nếu không thấy dấu hiệu; uncertain nếu thiếu bằng chứng. form_notes phải giải thích ngắn gọn bằng tiếng Việt khi khác original.

QUAN TRỌNG: tìm biển số xe. plate_bbox là vùng chuẩn hóa 0..1 theo ảnh gốc; nếu không nhìn thấy hoặc không chắc chắn thì null.

Thông tin người dùng: ${caption || "(không có)"}

Chỉ trả về một JSON object thuần với đúng các trường: ${Object.keys(schema.properties).join(", ")}.`;
  const bytes = new Uint8Array(fileBytes);
  const image = dataUrl(contentType, bytes);
  const errors = [];

  // Scout supports multimodal image messages. Fall back when its license or capacity is unavailable.
  try { const response = await env.AI.run("@cf/meta/llama-4-scout-17b-16e-instruct", { messages: [{ role: "system", content: "Trích xuất dữ liệu xe có bằng chứng; chỉ trả JSON, không suy đoán." }, { role: "user", content: [{ type: "image_url", image_url: { url: image } }, { type: "text", text: prompt }] }], max_tokens: 1200, temperature: 0 }); return { ...parseResult(response), _ai_model: "@cf/meta/llama-4-scout-17b-16e-instruct" }; } catch (error) { recordFailure(errors, "@cf/meta/llama-4-scout-17b-16e-instruct", error); }

  // Prefer the current Cloudflare-hosted Qwen vision model. It accepts
  // OpenAI-compatible multimodal message parts through the Workers AI binding.
  try {
    const response = await env.AI.run("@cf/qwen/qwen3.8-27b", {
      messages: [
        { role: "system", content: "Bạn trích xuất dữ liệu xe ô tô chính xác, bảo thủ, không bịa dữ liệu. Chỉ trả JSON." },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: prompt }
          ]
        }
      ],
      max_tokens: 1200,
      temperature: 0
    });
    const result = parseResult(response);
    return { ...result, _ai_model: "@cf/qwen/qwen3.8-27b" };
  } catch (error) {
    recordFailure(errors, "@cf/qwen/qwen3.8-27b", error);
  }

  // Legacy image-to-text fallback.
  try {
    const response = await env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
      image: bytes,
      prompt,
      max_tokens: 1200
    });
    const text = response?.description ?? response?.response ?? response;
    const result = parseResult(typeof text === "string" ? text : JSON.stringify(text));
    return { ...result, _ai_model: "@cf/llava-hf/llava-1.5-7b-hf" };
  } catch (error) {
    recordFailure(errors, "@cf/llava-hf/llava-1.5-7b-hf", error);
  }

  // Final fallback. This model can require one-time Meta license acceptance.
  try {
    const response = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      messages: [
        { role: "system", content: "Bạn trích xuất dữ liệu xe ô tô chính xác, bảo thủ, không bịa dữ liệu. Chỉ trả JSON." },
        { role: "user", content: prompt }
      ],
      image,
      max_tokens: 1200,
      temperature: 0
    });
    const result = parseResult(response);
    return { ...result, _ai_model: "@cf/meta/llama-3.2-11b-vision-instruct" };
  } catch (error) {
    recordFailure(errors, "@cf/meta/llama-3.2-11b-vision-instruct", error);
  }

  const failure = new Error("All vehicle vision models failed");
  failure.diagnostics = errors;
  throw failure;
}

// Optional COCO object detection: labels are supporting evidence, never vehicle identity.
export async function detectVehicleObjects(env,fileBytes){if(!env.AI)return [];try{const result=await env.AI.run("@cf/facebook/detr-resnet-50",{image:new Uint8Array(fileBytes)});const items=Array.isArray(result)?result:Array.isArray(result?.detections)?result.detections:[];return items.filter(x=>Number(x.score??x.confidence)>=0.5).slice(0,10).map(x=>({label:String(x.label??"").slice(0,40),score:Number(x.score??x.confidence)}));}catch{return [];}}
