export async function handleVideosPage(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/videos" && url.pathname !== "/videos/") return null;

  if (!env?.VIDEOS_ORIGIN || typeof env.VIDEOS_ORIGIN.fetch !== "function") {
    throw new Error("VIDEOS_ORIGIN service binding is unavailable");
  }
  const response = await env.VIDEOS_ORIGIN.fetch(new Request("https://videos-origin/videos", {
    method: "GET",
    headers: { accept: "application/json" }
  }));
  if (!response.ok) throw new Error(`Videos source API failed: HTTP ${response.status}`);

  const data = await response.json();
  const videos = Array.isArray(data?.videos) ? data.videos : [];

  let html = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Video Review — PhanThuanXtra</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#0a0a0a;color:#f5f0eb}h1{text-align:center;padding:20px;color:#c9a96e}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;padding:20px;max-width:1200px;margin:0 auto}.card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .2s}.card:active{transform:scale(0.98)}.card img{width:100%;aspect-ratio:16/9;object-fit:cover}.card .info{padding:12px}.card .title{font-size:0.9rem;color:#f5f0eb;margin-bottom:4px}.card .cat{font-size:0.75rem;color:#c9a96e}.embed{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999}.embed iframe{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:800px;aspect-ratio:16/9;border:0;border-radius:12px}.close{position:fixed;top:20px;right:20px;color:#0a0a0a;font-size:1.5rem;cursor:pointer;background:#c9a96e;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold}</style></head><body><h1>🎬 Video Review Xe</h1><div class="grid">';

  for (const video of videos) {
    html += '<div class="card" onclick="play(\'' + video.youtube_id + '\')"><img src="' + video.thumbnail + '" onerror="this.src=\'https://img.youtube.com/vi/' + video.youtube_id + '/hqdefault.jpg\'" loading="lazy"><div class="info"><div class="title">' + video.title + '</div><div class="cat">' + video.category + '</div></div></div>';
  }

  html += '</div><div class="embed" id="p"><span class="close" onclick="closeV()">&times;</span><iframe id="ifr" allowfullscreen></iframe></div><script>function play(id){document.getElementById("ifr").src="https://www.youtube.com/embed/"+id;document.getElementById("p").style.display="block"}function closeV(){document.getElementById("ifr").src="";document.getElementById("p").style.display="none"}</script></body></html>';

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  });
}
