(() => {"use strict";
const state={cars:[],filter:"all",query:"",sort:"featured",favorites:new Set(JSON.parse(localStorage.getItem("ptx:favorites")||"[]")),compare:new Set(JSON.parse(localStorage.getItem("ptx:compare")||"[]")),favoritesOnly:false};
function getVisitorId(){let value=localStorage.getItem("ptx:visitor_id")||"";if(!/^[A-Za-z0-9:_-]{12,160}$/.test(value)){value=globalThis.crypto?.randomUUID?.()||`web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;localStorage.setItem("ptx:visitor_id",value)}return value}
const visitorId=getVisitorId();
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function updateCounters(){$("#favCount").textContent=state.favorites.size;$("#compareCount").textContent=state.compare.size}
function save(){localStorage.setItem("ptx:favorites",JSON.stringify([...state.favorites]));localStorage.setItem("ptx:compare",JSON.stringify([...state.compare]));updateCounters()}
const CATEGORY_LABELS={suv:"SUV / Crossover",sedan:"Sedan",coupe:"Coupe",convertible:"Convertible",mpv:"MPV / Minivan",pickup:"Pickup",wagon:"Wagon",sport:"Thể thao",other:"Khác"};
function normalizeCar(c){const category=String(c.category??"other").toLowerCase();return{id:c.id,brand:c.brand??"",name:c.name??c.model??"",year:c.year??"",odo:c.odo??c.mileage??"",seats:c.seats??"",engine:c.engine??c.fuel??"",drive:c.drive??"",category,categoryLabel:CATEGORY_LABELS[category]??CATEGORY_LABELS.other,price:c.price??"",imageClass:c.imageClass??"",tag:c.tag??"",page:c.page??"#",image:c.cover_image??c.image??"",featured:Boolean(c.featured)}}
function updateFeatured(){}
function filtered(){const q=state.query.toLowerCase().trim();const list=state.cars.filter(c=>{const hay=[c.brand,c.name,c.year,c.odo,c.engine,c.category,c.drive,c.price].join(" ").toLowerCase();return(state.filter==="all"||c.category===state.filter)&&(!q||hay.includes(q))&&(!state.favoritesOnly||state.favorites.has(c.id))});if(state.sort==="year-desc")list.sort((a,b)=>Number(b.year)-Number(a.year));if(state.sort==="year-asc")list.sort((a,b)=>Number(a.year)-Number(b.year));if(state.sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));return list}
function carCard(c){
  const article=document.createElement("article");article.className="car-card";
  const image=document.createElement("div");image.className=["car-img",String(c.imageClass||"").replace(/[^A-Za-z0-9_-]/g,"")].filter(Boolean).join(" ");
  if(c.image)image.style.backgroundImage=`url("${String(c.image).replace(/["\\\n\r]/g,"")}")`;
  const tag=document.createElement("span");tag.textContent=c.tag;image.appendChild(tag);article.appendChild(image);
  const body=document.createElement("div");body.className="car-body";
  const muted=document.createElement("p");muted.className="muted";muted.textContent=`${c.brand} • ${c.categoryLabel}`;body.appendChild(muted);
  const title=document.createElement("h3");title.textContent=c.name;body.appendChild(title);
  const spec=document.createElement("div");spec.className="spec";for(const value of [c.year,c.odo,c.seats]){const span=document.createElement("span");span.textContent=value;spec.appendChild(span)}body.appendChild(spec);
  const price=document.createElement("div");price.className="price";const priceLabel=document.createElement("span");priceLabel.className="price-label";priceLabel.textContent="Giá tham khảo";const strong=document.createElement("strong");strong.textContent=c.price;price.append(priceLabel,strong);body.appendChild(price);
  const actions=document.createElement("div");actions.className="card-actions";const link=document.createElement("a");link.className="btn primary small";link.href=c.page;link.textContent="Xem chi tiết";actions.appendChild(link);
  const fav=document.createElement("button");fav.className=`icon-btn ${state.favorites.has(c.id)?"active":""}`;fav.dataset.fav=c.id;fav.title="Lưu xe";fav.textContent="♡";actions.appendChild(fav);
  const compare=document.createElement("button");compare.className=`icon-btn ${state.compare.has(c.id)?"active":""}`;compare.dataset.compare=c.id;compare.title="Thêm vào so sánh";compare.textContent="⇄";actions.appendChild(compare);body.appendChild(actions);article.appendChild(body);return article;
}
function render(){const list=filtered(),cars=$("#cars");cars.replaceChildren();if(!list.length){const notice=document.createElement("p");notice.className="notice";notice.textContent="Không tìm thấy xe phù hợp. Gọi 0866 997 891 để được hỗ trợ.";cars.appendChild(notice)}else cars.append(...list.map(carCard));$$("[data-fav]").forEach(b=>b.onclick=()=>{const id=b.dataset.fav;state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);save();render()});$$("[data-compare]").forEach(b=>b.onclick=()=>{const id=b.dataset.compare;if(state.compare.has(id))state.compare.delete(id);else if(state.compare.size<3)state.compare.add(id);else alert("Bạn chỉ có thể so sánh tối đa 3 xe.");save();render()});updateCounters()}
function showCompare(){const selected=state.cars.filter(c=>state.compare.has(c.id));const body=$("#compareBody");if(!selected.length)body.innerHTML='<p class="fav-empty">Chưa có xe nào. Hãy bấm ⇄ trên thẻ xe để thêm.</p>';else{const rows=[["Hãng","brand"],["Mẫu xe","name"],["Năm","year"],["ODO","odo"],["Động cơ","engine"],["Dẫn động","drive"],["Số chỗ","seats"],["Giá tham khảo","price"]];body.innerHTML='<table class="compare-table"><thead><tr><th>Thông tin</th>'+selected.map(c=>`<th>${esc(c.name)}</th>`).join("")+'</tr></thead><tbody>'+rows.map(r=>`<tr><th>${r[0]}</th>${selected.map(c=>`<td>${esc(c[r[1]])}</td>`).join("")}</tr>`).join("")+'</tbody></table><div class="actions"><a class="btn primary" href="tel:+84866997891">Gọi tư vấn</a><a class="btn zalo" href="https://zalo.me/0866997891" target="_blank" rel="noopener noreferrer">Nhắn Zalo</a></div>'}$("#compareModal").hidden=false}
const menu=$(".menu-toggle"),nav=$("#site-nav");if(menu&&nav){menu.onclick=()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open))};$$('#site-nav a').forEach(a=>a.onclick=()=>nav.classList.remove('open'))}
$$('.filter').forEach(b=>b.onclick=()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.filter=b.dataset.filter;render()});
const search=$("#search"),sort=$("#sort"),favoritesOnly=$("#favoritesOnly"),compareOpen=$("#compareOpen");
if(search)search.oninput=e=>{state.query=e.target.value.slice(0,80);render()};
if(sort)sort.onchange=e=>{state.sort=e.target.value;render()};
if(favoritesOnly)favoritesOnly.onclick=()=>{state.favoritesOnly=!state.favoritesOnly;favoritesOnly.classList.toggle('active',state.favoritesOnly);render()};
if(compareOpen)compareOpen.onclick=showCompare;
$$('[data-close]').forEach(x=>x.onclick=()=>{const modal=$("#compareModal");if(modal)modal.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const modal=$("#compareModal");if(modal)modal.hidden=true}});
const leadForm=$("#leadForm");if(leadForm)leadForm.onsubmit=async e=>{e.preventDefault();const f=new FormData(leadForm),status=$("#leadStatus"),need=f.get("need")||"",interest=f.get("interest")||"",origin=f.get("origin")||"",destination=f.get("destination")||"",flightDate=f.get("flight_date")||"",passengers=f.get("passengers")||"",source=need==="Business Jets / Private Aviation"?"business-jets":"website-lead",message=[need,interest,origin&&`Điểm đi: ${origin}`,destination&&`Điểm đến: ${destination}`,flightDate&&`Ngày/giờ: ${flightDate}`,passengers&&`Số khách: ${passengers}`,f.get("message")||""].filter(Boolean).join(" | ");status.textContent="Đang gửi...";try{const r=await fetch('/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:f.get('name'),phone:f.get('phone'),car_id:'',source,message,visitor_id:visitorId})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Không gửi được');status.textContent="Đã nhận yêu cầu. Chúng tôi sẽ liên hệ sớm.";leadForm.reset()}catch(x){status.textContent="Chưa gửi được. Vui lòng gọi 0866 997 891."}};
const aiFab=$("#aiFab"),aiPanel=$("#aiPanel"),aiClose=$("#aiClose"),aiInline=$("#aiOpenInline"),aiForm=$("#aiForm"),aiInput=$("#aiInput"),aiMessages=$("#aiMessages");
function openAI(){aiPanel.hidden=false;aiFab.setAttribute('aria-expanded','true');setTimeout(()=>aiInput?.focus(),50)}function closeAI(){aiPanel.hidden=true;aiFab.setAttribute('aria-expanded','false')}aiFab?.addEventListener('click',()=>aiPanel.hidden?openAI():closeAI());aiClose?.addEventListener('click',closeAI);aiInline?.addEventListener('click',openAI);
function addMsg(text,who){const d=document.createElement('div');d.className=`ai-msg ${who}`;d.textContent=text;aiMessages.appendChild(d);aiMessages.scrollTop=aiMessages.scrollHeight}
let aiConversationId=sessionStorage.getItem('ptx_ai_conversation')||'',aiBusy=false;
aiForm?.addEventListener('submit',async e=>{e.preventDefault();const message=aiInput.value.trim();if(!message||aiBusy)return;addMsg(message,'user');aiInput.value='';aiBusy=true;try{const r=await fetch('/api/ai-chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,conversation_id:aiConversationId,visitor_id:visitorId})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'AI unavailable');if(d.conversation_id){aiConversationId=d.conversation_id;sessionStorage.setItem('ptx_ai_conversation',aiConversationId)}addMsg(d.reply||'Đã ghi nhận yêu cầu.','bot')}catch(x){addMsg('Chưa kết nối được XTRA Intelligence. Vui lòng gọi 0866 997 891 hoặc để lại số điện thoại trong biểu mẫu lái thử.','bot')}finally{aiBusy=false}});


const liveChatOpen=$("#liveChatOpen");
let tawkLoading=false,tawkConfig=null;
function validTawkId(value){return /^[A-Za-z0-9_-]{6,80}$/.test(String(value||""))}
function loadTawk(){
  if(tawkLoading||!tawkConfig)return;
  if(!validTawkId(tawkConfig.property_id)||!validTawkId(tawkConfig.widget_id))return;
  tawkLoading=true;liveChatOpen.disabled=true;liveChatOpen.textContent="Đang mở chat...";
  globalThis.Tawk_API=globalThis.Tawk_API||{};
  globalThis.Tawk_LoadStart=new Date();
  globalThis.Tawk_API.onLoad=()=>{globalThis.Tawk_API?.maximize?.();liveChatOpen.textContent="Chat trực tiếp với showroom"};
  const script=document.createElement("script");
  script.async=true;script.charset="UTF-8";
  script.src=`https://embed.tawk.to/${tawkConfig.property_id}/${tawkConfig.widget_id}`;
  script.onload=()=>{liveChatOpen.disabled=false};
  script.onerror=()=>{tawkLoading=false;liveChatOpen.disabled=false;liveChatOpen.textContent="Chat trực tiếp với showroom"};
  document.head.appendChild(script);
}
if(liveChatOpen){
  fetch("/api/integrations/public-config",{cache:"no-store",credentials:"same-origin"})
    .then(r=>r.ok?r.json():null)
    .then(config=>{const tawk=config?.tawk;if(tawk?.enabled&&validTawkId(tawk.property_id)&&validTawkId(tawk.widget_id)){tawkConfig=tawk;liveChatOpen.hidden=false;liveChatOpen.addEventListener("click",loadTawk)}})
    .catch(()=>{});
}

const carsRoot=$("#cars");if(carsRoot)fetch('/api/cars',{cache:'no-store',credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(!d||!Array.isArray(d.cars))throw Error();state.cars=d.cars.map(normalizeCar);render()}).catch(()=>{const notice=document.createElement("p");notice.className="notice";notice.textContent="Không tải được kho xe. Vui lòng gọi 0866 997 891.";carsRoot.replaceChildren(notice)});
})();