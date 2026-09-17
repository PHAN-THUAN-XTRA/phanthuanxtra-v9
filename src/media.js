const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra}});

export async function storeMedia(env,key,body,contentType="application/octet-stream"){
  if(!env.MEDIA)throw new Error("MEDIA binding is not configured");
  const mutable=String(key).startsWith("admin/");
  await env.MEDIA.put(key,body,{httpMetadata:{contentType,cacheControl:mutable?"no-store":"public, max-age=31536000, immutable"}});
  return key;
}

async function brandedVehicleResponse(request,env,object){
  if(!env.IMAGES)return json({ok:false,error:"IMAGES binding is not configured"},503);
  if(!env.ASSETS)return json({ok:false,error:"ASSETS binding is not configured"},503);
  const overlayResponse=await env.ASSETS.fetch(new Request(new URL("/branding/pt-xtra-plate.svg",request.url)));
  if(!overlayResponse.ok||!overlayResponse.body)return json({ok:false,error:"PT Xtra overlay asset unavailable"},503);
  const result=await env.IMAGES.input(object.body)
    .draw(env.IMAGES.input(overlayResponse.body).transform({width:260}),{bottom:18})
    .output({format:"image/jpeg",quality:90});
  return result.response({headers:{"cache-control":"public, max-age=31536000, immutable","x-pt-xtra-branding":"display-overlay"}});
}

function decodeMediaKey(pathname){
  const raw=pathname.slice("/media/".length);
  try{return decodeURIComponent(raw)}catch{return null}
}

function isAuthorized(request,env){
  const token=env.ADMIN_TOKEN;
  const authorization=request.headers.get("Authorization")||"";
  return !!token&&authorization.startsWith("Bearer ")&&authorization.slice(7)===token;
}

export async function handleMediaApi(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/media/"))return null;
  if(request.method!=="GET"&&request.method!=="HEAD"&&request.method!=="DELETE")return json({error:"Method Not Allowed"},405,{Allow:"GET, HEAD, DELETE"});
  if(!env.MEDIA)return json({ok:false,error:"MEDIA binding is not configured"},503);
  const key=decodeMediaKey(url.pathname);
  if(key===null||!key||key.includes(".."))return json({ok:false,error:"Invalid media key"},400);
  if(request.method==="DELETE"){
    if(!isAuthorized(request,env))return json({error:"Unauthorized"},401,{"WWW-Authenticate":"Bearer"});
    await env.MEDIA.delete(key);
    return json({ok:true,key},200);
  }
  const object=await env.MEDIA.get(key);
  if(!object)return json({ok:false,error:"Not Found"},404);
  if(url.searchParams.get("branding")==="pt-xtra"&&request.method==="GET")return brandedVehicleResponse(request,env,object);
  const headers=new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag",object.httpEtag);
  if(String(key).startsWith("admin/"))headers.set("cache-control","no-store");
  else headers.set("cache-control",headers.get("cache-control")||"public, max-age=31536000, immutable");
  return request.method==="HEAD"?new Response(null,{headers}):new Response(object.body,{headers});
}
