import test from "node:test";
import assert from "node:assert/strict";
import { handleVideosPage } from "../src/videos-page.js";

test("videos page preserves legacy /videos behavior through service binding", async () => {
  const env = {
    VIDEOS_ORIGIN: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, "/videos");
        assert.equal(request.headers.get("accept"), "application/json");
        return new Response(JSON.stringify({
          videos: [{
            youtube_id: "abc123",
            thumbnail: "https://example.com/thumb.jpg",
            title: "Review Test",
            category: "Cars"
          }]
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
  };

  const response = await handleVideosPage(new Request("https://phanthuanxtra.com/videos"), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  const html = await response.text();
  assert.match(html, /Video Review — PhanThuanXtra/);
  assert.match(html, /🎬 Video Review Xe/);
  assert.match(html, /Review Test/);
  assert.match(html, /abc123/);
});

test("videos page fails closed if service binding is missing", async () => {
  await assert.rejects(
    () => handleVideosPage(new Request("https://phanthuanxtra.com/videos"), {}),
    /VIDEOS_ORIGIN service binding is unavailable/
  );
});

test("videos page ignores unrelated paths", async () => {
  assert.equal(await handleVideosPage(new Request("https://phanthuanxtra.com/cars"), {}), null);
});
