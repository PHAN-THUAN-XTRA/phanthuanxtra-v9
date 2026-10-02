import test from "node:test";
import assert from "node:assert/strict";
import { handleVideosPage } from "../src/videos-page.js";

test("videos page preserves legacy /videos behavior on main Worker", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://phanthuanxtra-images.phanthuanmodelactor.workers.dev/videos");
    return new Response(JSON.stringify({
      videos: [{
        youtube_id: "abc123",
        thumbnail: "https://example.com/thumb.jpg",
        title: "Review Test",
        category: "Cars"
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handleVideosPage(new Request("https://phanthuanxtra.com/videos"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    const html = await response.text();
    assert.match(html, /Video Review — PhanThuanXtra/);
    assert.match(html, /🎬 Video Review Xe/);
    assert.match(html, /Review Test/);
    assert.match(html, /abc123/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("videos page ignores unrelated paths", async () => {
  assert.equal(await handleVideosPage(new Request("https://phanthuanxtra.com/cars")), null);
});
