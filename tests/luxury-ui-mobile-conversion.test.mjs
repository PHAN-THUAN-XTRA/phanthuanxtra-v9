import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const homepage = read('public/index.html');
const carDetail = read('public/car.html');
const script = read('public/script.js');
const stylesheet = read('public/style.css');
const energy = read('public/green-energy.html');
const yachts = read('public/yachts.html');

test('luxury UI scripts parse and car-detail mobile navigation resolves to existing anchors', () => {
  assert.doesNotThrow(() => new vm.Script(script, {filename:'public/script.js'}));
  for (const [, source] of carDetail.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (source.trim()) assert.doesNotThrow(() => new vm.Script(source, {filename:'public/car.html:inline'}));
  }
  assert.match(carDetail, /class="menu-toggle"[^>]+aria-controls="site-nav"[^>]+aria-expanded="false"/);
  assert.match(carDetail, /href="\/#ecosystem"/);
  assert.doesNotMatch(carDetail, /href="\/#services"/);
  assert.match(carDetail, /nav\.classList\.toggle\('open'\)/);
  assert.match(carDetail, /key==='Escape'/);
  assert.match(homepage, /id="ecosystem"/);
});

test('catalogue keeps filters readable, semantic photos and deliberate car enquiries', () => {
  assert.match(stylesheet, /\.filters\{max-width:100%;overflow-x:auto/);
  assert.match(stylesheet, /\.filter\{flex:0 0 auto;white-space:nowrap;min-height:44px\}/);
  assert.match(stylesheet, /\.car-img>img\{display:block;width:100%;height:100%;object-fit:cover/);
  assert.match(stylesheet, /\.card-actions \.btn\.ghost\{background:#fff;color:#17362e/);
  assert.match(script, /photo\.alt=/);
  assert.match(script, /photo\.loading='lazy'/);
  assert.match(script, /photo\.decoding='async'/);
  assert.match(script, /booking\.dataset\.bookCar=String\(c\.id\)/);
  assert.match(homepage, /id="carsResultCount"[^>]+role="status"/);
  assert.match(script, /'aria-pressed',String\(state\.favorites\.has\(c\.id\)\)/);
  assert.match(script, /'aria-pressed',String\(state\.compare\.has\(c\.id\)\)/);
  assert.match(carDetail, /booking\.href='\/#test-drive'/);
  assert.match(carDetail, /sessionStorage\.setItem\('ptx:inquiry_car'/);
});

test('green energy and yachts have one on-page, opt-in lead form each', () => {
  for (const [name, html, need] of [
    ['green-energy', energy, 'Năng lượng xanh / PV / ESS'],
    ['yachts', yachts, 'Du thuyền cao cấp'],
  ]) {
    assert.equal((html.match(/id="leadForm"/g)||[]).length, 1, name);
    assert.equal((html.match(/id="consultation"/g)||[]).length, 1, name);
    assert.match(html, /href="#consultation"/);
    assert.match(html, /id="leadStatus"[^>]+role="status"/);
    assert.ok(html.includes('name="need" value="' + need + '"'));
    assert.match(html, /name="phone" required/);
    assert.match(html, /<script src="\/script\.js" defer>/);
  }
  assert.match(script, /fetch\('\/api\/leads',\{method:'POST'/);
  assert.match(script, /d\.ok!==true\|\|d\.stored!==true/);
  assert.match(script, /car_id:selectedInquiryCarId/);
  assert.doesNotMatch(carDetail + energy + yachts + homepage, /AUTO_PUBLISH|CONTENT_RUNNER_LIVE_ENABLED=1/);
});

test('headless DOM simulation: public-only car render, real image, booking prefill, lead payload', async () => {
  class Element {
    constructor(tag='div') {
      this.tagName=tag.toLowerCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.value='';
      this.classList={add(){},remove(){},toggle(){return true},contains(){return false}};
    }
    append(...values){this.children.push(...values)}
    appendChild(value){this.children.push(value);return value}
    replaceChildren(...values){this.children=[...values]}
    setAttribute(k,v){this.attributes[k]=v}
    addEventListener(){}
    querySelector(selector){return selector==='[name="interest"]'?interest:null}
  }
  const nodes={};
  for(const id of ['cars','favCount','compareCount','carsResultCount','leadForm','leadStatus'])nodes['#'+id]=new Element(id);
  const interest=new Element('input');interest.value='';
  const form=nodes['#leadForm'];form.fields={name:'Khách thử',phone:'0900000000',need:'Lái thử xe',interest:'',message:''};
  const store={};
  const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}};
  const session={};
  const sessionStorage={getItem:k=>session[k]||null,setItem:(k,v)=>{session[k]=v},removeItem:k=>{delete session[k]}};
  const all = selector => {
    const results=[];const walk=node=>{
      if(selector==='[data-fav]'&&node.dataset?.fav)results.push(node);
      if(selector==='[data-compare]'&&node.dataset?.compare)results.push(node);
      if(selector==='[data-book-car]'&&node.dataset?.bookCar)results.push(node);
      for(const c of node.children||[])if(c instanceof Element)walk(c);
    };
    walk(nodes['#cars']);return results;
  };
  const document={
    createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),
    querySelector:selector=>selector==='#leadForm [name="interest"]'?interest:(nodes[selector]||null),
    querySelectorAll:all,addEventListener(){}
  };
  const observed=[];const stock=[
    {id:'tg-786',status:'available',brand:'Porsche',name:'718 Boxster',category:'convertible',year:2024,price:'Liên hệ',image:'/media/porsche.webp',page:'/car.html?id=tg-786'},
    {id:'tg-hidden',status:'hidden',brand:'Lexus',name:'Không công khai',category:'suv',image:'/private.webp'}
  ];
  const context={
    document,localStorage,sessionStorage,location:{hash:''},console,
    FormData:class{constructor(node){this.node=node}get(k){return k==='interest'?interest.value:(this.node.fields[k]||'')}},
    fetch:async(url,options)=>{if(url==='/api/cars')return {ok:true,json:async()=>({cars:stock})};
      if(url==='/api/leads'){observed.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,stored:true})}}
      throw Error('Unexpected endpoint: '+url)},
    setTimeout:()=>{},globalThis:{crypto:{randomUUID:()=> 'test-visitor-1234567890'}}
  };
  vm.runInNewContext(script,context,{filename:'public/script.js'});
  await new Promise(resolve=>setImmediate(resolve));
  const cards=nodes['#cars'].children;
  assert.equal(cards.length,1,'hidden vehicle should not be listed');
  const car=cards[0];assert.equal(car.tagName,'article');
  const image=car.children[0].children[0];
  assert.equal(image.tagName,'img');assert.equal(image.src,'/media/porsche.webp');
  assert.equal(image.loading,'lazy');assert.match(image.alt,/Porsche 718 Boxster/);
  assert.equal(all('[data-book-car]').length,1);
  all('[data-book-car]')[0].onclick();
  assert.equal(interest.value,'Porsche 718 Boxster');
  assert.equal(form.onsubmit instanceof Function,true);
  await form.onsubmit({preventDefault(){}});
  assert.equal(observed.length,1);
  assert.equal(observed[0].car_id,'tg-786');
  assert.equal(observed[0].phone,'0900000000');
  assert.equal(observed[0].source,'test-drive');
  assert.equal(observed[0].message.includes('Porsche 718 Boxster'),true);
  assert.equal(nodes['#leadStatus'].textContent,'Đã nhận yêu cầu. Chúng tôi sẽ liên hệ sớm.');
});
