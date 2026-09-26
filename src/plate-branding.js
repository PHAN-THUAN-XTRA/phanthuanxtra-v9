const clamp01 = value => Math.min(1, Math.max(0, Number(value)));

export function normalizePlateBox(box) {
  if (!box || typeof box !== "object") return null;
  const x = clamp01(box.x);
  const y = clamp01(box.y);
  const width = clamp01(box.width);
  const height = clamp01(box.height);
  if (!(width > 0.01 && height > 0.005)) return null;
  if (x + width > 1.001 || y + height > 1.001) return null;
  return { x, y, width, height };
}

export function hasValidPlateBox(box) {
  return Boolean(normalizePlateBox(box));
}

export async function createPtXtraPlateImage(env, sourceBytes, contentType, plateBox, outputKey, outputContentType = "image/jpeg") {
  if (!env.IMAGES) throw new Error("IMAGES binding is not configured");
  if (!env.MEDIA) throw new Error("MEDIA binding is not configured");
  if (!env.ASSETS) throw new Error("ASSETS binding is not configured");
  const box = normalizePlateBox(plateBox);
  if (!box) throw new Error("AI did not return a valid license-plate bounding box");

  const info = await env.IMAGES.info(sourceBytes);
  const width = Number(info?.width || 0);
  const height = Number(info?.height || 0);
  if (!(width > 0 && height > 0)) throw new Error("Unable to determine source image dimensions");

  const padX = Math.min(box.x, 1 - box.x - box.width, box.width * 0.06);
  const padY = Math.min(box.y, 1 - box.y - box.height, box.height * 0.12);
  const left = Math.max(0, Math.round((box.x - padX) * width));
  const top = Math.max(0, Math.round((box.y - padY) * height));
  const overlayWidth = Math.max(40, Math.round((box.width + padX * 2) * width));
  const overlayHeight = Math.max(20, Math.round((box.height + padY * 2) * height));

  const overlayResponse = await env.ASSETS.fetch(new Request("https://assets.invalid/branding/pt-xtra-plate.svg"));
  if (!overlayResponse.ok || !overlayResponse.body) throw new Error("PT Xtra plate overlay asset unavailable");

  const result = await env.IMAGES.input(sourceBytes)
    .draw(
      env.IMAGES.input(overlayResponse.body).transform({ width: overlayWidth, height: overlayHeight }),
      { left, top }
    )
    .output({ format: outputContentType === "image/webp" ? "image/webp" : "image/jpeg", quality: 92, metadata: "none" });

  const response = result.response({
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "x-pt-xtra-branding": "plate-replaced"
    }
  });
  if (!response.ok || !response.body) throw new Error(`PT Xtra image transform failed: ${response.status}`);
  await env.MEDIA.put(outputKey, response.body, {
    httpMetadata: { contentType: outputContentType === "image/webp" ? "image/webp" : "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { branding: "PT Xtra", brandingTarget: "license_plate" }
  });
  return outputKey;
}
