// Read-only metadata probe. Never return keys, provider messages or generated content.
const statuses=new Set(['UNAVAILABLE','RESOURCE_EXHAUSTED','PERMISSION_DENIED','UNAUTHENTICATED','NOT_FOUND','INVALID_ARGUMENT','FAILED_PRECONDITION','INTERNAL','DEADLINE_EXCEEDED']);
async function boundedJson(response) {
  if(!response.body)return {};
  const reader=response.body.getReader(),chunks=[];let size=0;
  for(let i=0;i<128;i++) {
    const {done,value}=await reader.read();
    if(done){const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));}
    size+=value.byteLength;
    if(size>32768){await reader.cancel();throw new Error('oversized');}
    chunks.push(value);
  }
  await reader.cancel();throw new Error('oversized');
}
export async function inspectGeminiProvider(env) {
  const model=typeof env.GEMINI_MODEL==='string'&&/^gemini-[0-9][a-z0-9.-]{0,79}$/.test(env.GEMINI_MODEL)?env.GEMINI_MODEL:null;
  const report={provider:'gemini',model,configured:Boolean(model&&env.GEMINI_API_KEY),generation_verified:false};
  if(!report.configured)return {...report,error:!env.GEMINI_API_KEY?'missing_key':'invalid_model'};
  try {
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}`,{
      headers:{'x-goog-api-key':env.GEMINI_API_KEY},redirect:'error',signal:AbortSignal.timeout(8000)
    });
    const data=await boundedJson(response);
    if(!response.ok)return {...report,http_status:response.status,available:false,provider_status:statuses.has(data?.error?.status)?data.error.status:'UNKNOWN'};
    return {...report,http_status:response.status,available:data?.name===`models/${model}`,supports_generate_content:Array.isArray(data?.supportedGenerationMethods)&&data.supportedGenerationMethods.includes('generateContent')};
  }catch(error){return {...report,error:['TimeoutError','AbortError'].includes(error?.name)?'timeout':'probe_failed'};}
}
