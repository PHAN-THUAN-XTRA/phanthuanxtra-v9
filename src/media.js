import { verifyAdminToken } from "./admin-auth.js";

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra}});

export async function storeMedia(env,key,body,contentType="application/octet-stream"){
  if(!env.MEDIA)throw new Error("MEDIA binding is not configured");
  const mutable=String(key).startsWith("admin/");
  await env.MEDIA.put(key,body,{httpMetadata:{contentType,cacheControl:mutable?"no-store":"public, max-age=31536000, immutable"}});
  return key;
}

async function brandedVehicleResponse(request,env,object,privateAccess=false){
  if(!env.IMAGES)return json({ok:false,error:"IMAGES binding is not configured"},503);
  if(!env.ASSETS)return json({ok:false,error:"ASSETS binding is not configured"},503);
  const overlayResponse=await env.ASSETS.fetch(new Request(new URL("/branding/pt-xtra-plate.svg",request.url)));
  if(!overlayResponse.ok||!overlayResponse.body)return json({ok:false,error:"PT Xtra overlay asset unavailable"},503);
  const result=await env.IMAGES.input(object.body)
    .draw(env.IMAGES.input(overlayResponse.body).transform({width:260}),{bottom:18})
    .output({format:"image/jpeg",quality:90});
  return result.response({headers:{"cache-control":privateAccess?"private, no-store":"public, max-age=31536000, immutable","x-pt-xtra-branding":"display-overlay"}});
}

function decodeMediaKey(pathname){
  const raw=pathname.slice("/media/".length);
  try{return decodeURIComponent(raw)}catch{return null}
}

async function isAuthorized(request,env){
  if((await verifyAdminToken(request,env)).ok)return true;
  const token=env.ADMIN_TOKEN;
  const authorization=request.headers.get("Authorization")||"";
  const legacyHeader=request.headers.get("X-Admin-Token")||"";
  return !!token&&(
    (authorization.startsWith("Bearer ")&&authorization.slice(7)===token) ||
    legacyHeader===token
  );
}

async function publicMediaReference(env,key){
  if(!env.DB)return false;
  const url=`/media/${key}`;
  try {
    const row=await env.DB.prepare(`SELECT 1 AS found FROM posts WHERE status='published' AND cover_image=?
      UNION SELECT 1 FROM cars WHERE status!='hidden' AND cover_image=?
      UNION SELECT 1 FROM car_images i JOIN cars c ON c.id=i.car_id WHERE c.status!='hidden' AND i.url=? LIMIT 1`)
      .bind(url,url,url).first();
    return !!row;
  } catch(error){console.error('media_public_reference_failed',error?.name||'Error');return false;}
}

async function privateMediaAccess(request,env,key,object){
  const privateKey=/^admin\//.test(key)||/^blog\//.test(key)||/^vehicles\/inbox-/.test(key);
  const markedDraft=object.customMetadata?.privacy==='draft';
  if(!privateKey&&!markedDraft)return {allowed:true,private:false};
  if(await publicMediaReference(env,key))return {allowed:true,private:false};
  return {allowed:await isAuthorized(request,env),private:true};
}

export async function handleMediaApi(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/media/"))return null;
  if(request.method!=="GET"&&request.method!=="HEAD"&&request.method!=="DELETE")return json({error:"Method Not Allowed"},405,{Allow:"GET, HEAD, DELETE"});
  if(!env.MEDIA)return json({ok:false,error:"MEDIA binding is not configured"},503);
  const key=decodeMediaKey(url.pathname);
  if(key===null||!key||key.includes(".."))return json({ok:false,error:"Invalid media key"},400);
  if(request.method==="DELETE"){
    if(!(await isAuthorized(request,env)))return json({error:"Unauthorized"},401,{"WWW-Authenticate":"Bearer"});
    await env.MEDIA.delete(key);
    return json({ok:true,key},200);
  }
  const object=await env.MEDIA.get(key);
  if(!object)return json({ok:false,error:"Not Found"},404);
  const access=await privateMediaAccess(request,env,key,object);
  if(!access.allowed)return json({ok:false,error:"Not Found"},404);
  if(url.searchParams.get("branding")==="pt-xtra"&&request.method==="GET")return brandedVehicleResponse(request,env,object,access.private);
  const headers=new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag",object.httpEtag);
  if(access.private)headers.set("cache-control","private, no-store");
  else headers.set("cache-control",headers.get("cache-control")||"public, max-age=31536000, immutable");
  if(request.method==="HEAD")return new Response(null,{headers});

  const requested=url.searchParams.get('format');
  if(requested==='avif'&&url.searchParams.get('source')!=='1'){
    const originalUrl=new URL(request.url);
    originalUrl.searchParams.delete('format');
    originalUrl.searchParams.set('source','1');
    const transformed=await fetch(new Request(originalUrl.toString(),{headers:request.headers}),{cf:{image:{format:'avif',quality:76}}});
    // Cloudflare Image Resizing may not be enabled for the Worker subrequest path.
    // Keep the documented WebP fallback for an already privacy-reviewed canonical image.
    if(!transformed.ok) {
      if(transformed.status===404)return new Response(object.body,{status:200,headers});
      return transformed;
    }
    const transformedHeaders=new Headers(transformed.headers);
    transformedHeaders.set("cache-control",access.private?"private, no-store":"public, max-age=31536000, immutable");
    transformedHeaders.delete("vary");
    return new Response(transformed.body,{status:transformed.status,statusText:transformed.statusText,headers:transformedHeaders});
  }
  if(url.searchParams.get('source')==='1')return new Response(object.body,{status:200,headers});
  if(request.method==="GET"&&env.IMAGES&&String(headers.get("content-type")||"").startsWith("image/")){
    const accept=request.headers.get("Accept")||"";
    const format=requested==='webp'?'image/webp':/image\/webp/i.test(accept)?'image/webp':null;
    if(format){
      const result=await env.IMAGES.input(object.body).output({format,quality:82});
      const optimized=await result.response();
      const optimizedHeaders=new Headers(optimized.headers);
      optimizedHeaders.set("cache-control",access.private?"private, no-store":"public, max-age=31536000, immutable");
      if(!requested)optimizedHeaders.set('vary','Accept');else optimizedHeaders.delete("vary");
      return new Response(optimized.body,{status:optimized.status,statusText:optimized.statusText,headers:optimizedHeaders});
    }
  }
  if(!requested)headers.set('vary','Accept');
  return new Response(object.body,{status:200,headers});
}
