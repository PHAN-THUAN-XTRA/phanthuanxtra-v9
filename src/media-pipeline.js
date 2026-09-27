const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const blobStream=bytes=>new Blob([bytes]).stream();

export async function prepareVehicleWebp(env,bytes,plateBBox=null,{maxWidth=1800,quality=82}={}){
  if(!env.IMAGES)throw new Error("IMAGES binding is not configured");
  const info=await env.IMAGES.info(blobStream(bytes));
  const width=Number(info?.width||0),height=Number(info?.height||0);
  if(!width||!height)throw new Error("Không đọc được kích thước ảnh");
  let image=env.IMAGES.input(blobStream(bytes));
  if(width>maxWidth)image=image.transform({width:maxWidth,fit:"scale-down"});
  let redacted=false;
  if(plateBBox&&Number(plateBBox.width)>0&&Number(plateBBox.height)>0){
    const scale=Math.min(1,maxWidth/width),outW=Math.round(width*scale),outH=Math.round(height*scale);
    const x=Math.round(clamp(plateBBox.x,0,1)*outW),y=Math.round(clamp(plateBBox.y,0,1)*outH);
    const w=Math.max(8,Math.round(clamp(plateBBox.width,0,1)*outW)),h=Math.max(8,Math.round(clamp(plateBBox.height,0,1)*outH));
    const svg=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" rx="'+Math.max(2,Math.round(h*.08))+'" fill="#080808"/></svg>');
    image=image.draw(env.IMAGES.input(new Blob([svg],{type:"image/svg+xml"}).stream()).transform({width:w,height:h}),{left:x,top:y});
    redacted=true;
  }
  const response=(await image.output({format:"image/webp",quality}).response());
  if(!response.ok)throw new Error("Không thể chuyển ảnh sang WebP");
  return{bytes:await response.arrayBuffer(),contentType:"image/webp",width,height,redacted};
}
