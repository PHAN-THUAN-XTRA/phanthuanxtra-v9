import test from "node:test";
import assert from "node:assert/strict";
import {handleBlog} from "../src/blog.js";
const post={
  id:786,slug:"hummer-h2-luxury-2009",title:"HUMMER H2 LUXURY 2009",
  excerpt:"Xe sang Mỹ",content:"Thông tin được chủ xe duyệt.",
  status:"published",category:"Tin xe",tags_json:"[]",
  cover_image:"https://phanthuanxtra.com/media/vehicles/telegram-786-example.webp"
};
function database(item){
  return {withSession(){return this},prepare(){return{bind(){return this},first:async()=>item,all:async()=>({results:item?[item]:[]})}}};
}
test("blog render preserves image SEO alt and links existing cover into lightbox",async()=>{
  const r=await handleBlog(new Request("https://phanthuanxtra.com/blog/hummer-h2-luxury-2009"),{DB:database(post)});
  assert.equal(r.status,200);
  const html=await r.text();
  assert.match(r.headers.get('content-type'),/text\/html/);
  assert.match(html,/data-ptx-image-viewer/);
  assert.match(html,/src="\/image-viewer\.js" defer/);
  assert.match(html,/href="\/image-viewer\.css"/);
  assert.match(html,/alt="HUMMER H2 LUXURY 2009"/);
  assert.match(html,/media\/vehicles\/telegram-786-example.webp/);
  assert.match(html,/Thông tin được chủ xe duyệt/);
});
test("posts without images remain valid and show no missing-image links",async()=>{
  const r=await handleBlog(new Request("https://phanthuanxtra.com/blog/hummer-h2-luxury-2009"),{DB:database({...post,cover_image:null})});
  assert.equal(r.status,200);
  assert.doesNotMatch(await r.text(),/data-ptx-image-viewer/);
});
