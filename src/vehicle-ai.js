const VISION_MODELS = [
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/llava-hf/llava-1.5-7b-hf",
  "@cf/meta/llama-3.2-11b-vision-instruct"
];

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
  const text = typeof result === "string" ? result : result?.response;
  if (!text) throw new Error("Workers AI returned no response");
  try { return JSON.parse(text); } catch { const match = text.match(/\{[\s\S]*\}/); if (!match) throw new Error("AI response is not valid JSON"); return JSON.parse(match[0]); }
}

export async function analyzeVehicleImage(env, fileBytes, contentType, caption = "") {
  if (!env.AI) throw new Error("Workers AI binding AI is not configured");
  const prompt = `Bạn là bộ phận nhập kho xe của Phan Thuần Xtra. Chỉ ghi dữ kiện nhìn thấy hoặc được cung cấp rõ ràng; không bịa. Không suy đoán năm sản xuất, ODO, giá, phiên bản, động cơ, option, màu hoặc xuất xứ. Nếu không đủ bằng chứng trả null và thêm trường vào missing_fields. origin/origin_country chỉ ghi khi có bằng chứng rõ từ caption, giấy tờ hoặc dữ kiện nhận dạng đáng tin cậy. Phân biệt form hiện tại với xe gốc: form_state=facelift nếu ngoại hình có dấu hiệu facelift nhưng không coi facelift là năm sản xuất; up_form nếu đã đổi ngoại hình sang form đời mới; modified nếu độ/chỉnh sửa; original nếu không thấy dấu hiệu; uncertain nếu thiếu bằng chứng. form_notes phải giải thích ngắn gọn bằng tiếng Việt khi khác original.

QUAN TRỌNG: tìm biển số xe. plate_bbox là vùng chuẩn hóa 0..1 theo ảnh gốc; nếu không nhìn thấy hoặc không chắc chắn thì null.

Thông tin người dùng: ${caption || "(không có)"}`;
  const input = { messages: [{ role: "system", content: "Bạn trích xuất dữ liệu xe ô tô chính xác, bảo thủ, không bịa dữ liệu. Tách xuất xứ và form hiện tại khỏi đời xe gốc." }, { role: "user", content: prompt }], image: dataUrl(contentType, new Uint8Array(fileBytes)), max_tokens: 1200, temperature: 0, response_format: { type: "json_schema", json_schema: schema } };
  const errors = [];
  for (const model of VISION_MODELS) {
    try {
      const result = parseResult(await env.AI.run(model, input));
      return { ...result, _ai_model: model };
    } catch (error) {
      errors.push(model + ": " + String(error?.message || error).slice(0, 240));
    }
  }
  throw new Error("All vehicle vision models failed: " + errors.join(" | "));

}
