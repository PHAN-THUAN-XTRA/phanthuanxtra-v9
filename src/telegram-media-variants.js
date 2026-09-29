const clean=v=>String(v??"").trim();

async function encode(env,bytes,format,quality){
  if(!env.IMAGES)throw new Error("Cloudflare Images Free binding is not configured");
  const output=await env.IMAGES.input(new Blob([bytes]).stream())
    .transform({width:1200,fit:"scale-down"})
    .output({format,quality});
  const response=output.response();
  if(!response.ok)throw new Error("Cloudflare image transform failed: "+response.status);
  return new Uint8Array(await response.arrayBuffer());
}

export async function storeTelegramVehicleVariants(env,bytes,prefix){
  if(!env.MEDIA)throw new Error("MEDIA binding is not configured");
  const base="vehicles/"+clean(prefix).replace(/[^A-Za-z0-9._/-]/g,"-");
  const [avif,webp]=await Promise.all([
    encode(env,bytes,"image/avif",76),
    encode(env,bytes,"image/webp",82)
  ]);
  const avifKey=base+".avif",webpKey=base+".webp";
  const meta={source:"telegram",processing:"format-only",pair:base};
  try{
    await env.MEDIA.put(avifKey,avif,{httpMetadata:{contentType:"image/avif",cacheControl:"public, max-age=31536000, immutable"},customMetadata:{...meta,format:"avif"}});
    await env.MEDIA.put(webpKey,webp,{httpMetadata:{contentType:"image/webp",cacheControl:"public, max-age=31536000, immutable"},customMetadata:{...meta,format:"webp"}});
  }catch(error){
    await Promise.allSettled([env.MEDIA.delete(avifKey),env.MEDIA.delete(webpKey)]);
    throw error;
  }
  return {key:webpKey,url:"/media/"+webpKey,webp_key:webpKey,avif_key:avifKey,webp_url:"/media/"+webpKey,avif_url:"/media/"+avifKey,delivery_formats:["avif","webp"],processing:"format-only"};
}
