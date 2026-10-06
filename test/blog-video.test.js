import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeId,facebookVideoUrl,renderBlogContent,videoEditorialError} from '../src/blog-video.js';
import {normalizePostPayload} from '../src/post-persistence.js';

test('full YouTube URLs and legacy iframe become safe embeds with full watch link',()=>{
  assert.equal(youtubeId('https://youtu.be/khK5qPSDcB8?t=12'),'khK5qPSDcB8');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=KgfkNtlwRkg'),'KgfkNtlwRkg');
  const html=renderBlogContent('<div><iframe src="https://www.youtube.com/embed/khK5qPSDcB8" onload="alert(1)"></iframe></div>');
  assert.match(html,/youtube-nocookie\.com\/embed\/khK5qPSDcB8/);
  assert.match(html,/youtube\.com\/watch\?v=khK5qPSDcB8/);
  assert.doesNotMatch(html,/onload|<div><iframe src="https:\/\/www\.youtube\.com/);
});
test('standalone Facebook Reel renders embedded video plus safe fallback link',()=>{
  const facebook='https://www.facebook.com/share/r/19Tc55Na2m/';
  assert.equal(facebookVideoUrl(facebook),facebook);
  assert.equal(facebookVideoUrl('https://facebook.com.evil.test/share/r/19Tc55Na2m/'),null);
  const html=renderBlogContent('Racing Yellow & mâm đen 20-inch\n'+facebook+'\nBordeaux Red');
  assert.match(html,/Racing Yellow &amp; mâm đen 20-inch/);
  assert.match(html,/facebook\.com\/plugins\/video\.php\?href=/);
  assert.match(html,/19Tc55Na2m/);
  assert.match(html,/Xem video thực tế trên Facebook/);
  assert.match(html,/aspect-ratio:9\/16/);
  assert.match(html,/Bordeaux Red/);
});
test('Facebook canonical video paths are accepted while untrusted hosts are rejected',()=>{
  assert.equal(facebookVideoUrl('https://www.facebook.com/reel/123456789/'),'https://www.facebook.com/reel/123456789/');
  assert.equal(facebookVideoUrl('https://www.facebook.com/PhanThuanSaigon/videos/1351047426633823/'),'https://www.facebook.com/PhanThuanSaigon/videos/1351047426633823/');
  assert.equal(facebookVideoUrl('http://www.facebook.com/reel/123/'),null);
});
test('untrusted video HTML never executes',()=>{
  assert.equal(youtubeId('https://youtube.com.evil.test/watch?v=khK5qPSDcB8'),null);
  assert.match(renderBlogContent('<script>alert(1)</script>'),/&lt;script&gt;/);
  assert.match(videoEditorialError({content:'<iframe src="https://evil.test/x"></iframe>',slug:'video',title:'Video'}),/YouTube/);
});
test('publication rejects mismatched car review slug while allowing existing URL corrections',()=>{
  const p={title:'Giao nhanh về Nhà',slug:'video-review-xe-so-2-chi-tiet-moi-goc-nhin',content:'https://www.youtube.com/watch?v=KgfkNtlwRkg',status:'published'};
  assert.match(normalizePostPayload(p).error,/Slug review xe/);
  assert.equal(normalizePostPayload(p,{slug:p.slug}).error,undefined);
});
