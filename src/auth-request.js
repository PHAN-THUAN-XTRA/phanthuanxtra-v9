// Public credential endpoints must bound the actual stream, not trust Content-Length.
const MAX_AUTH_BYTES = 8 * 1024;
const MAX_CHUNKS = 256;
const failure = (status, error) => ({response: Response.json({error}, {status, headers:{
  'cache-control':'no-store', 'x-content-type-options':'nosniff'
}})});

export async function readAuthJson(request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_AUTH_BYTES) {
    await request.body?.cancel().catch(()=>{});
    return failure(413, 'Nội dung xác thực vượt giới hạn 8 KiB.');
  }
  if (!request.body) return failure(400, 'JSON xác thực không hợp lệ.');
  const reader=request.body.getReader(), chunks=[];
  let size=0, done=false;
  try {
    for(let count=0;count<MAX_CHUNKS;count++) {
      const part=await reader.read();
      if(part.done){done=true;break;}
      size+=part.value.byteLength;
      if(size>MAX_AUTH_BYTES) break;
      chunks.push(part.value);
    }
    if(!done) {
      await reader.cancel().catch(()=>{});
      return failure(413, 'Nội dung xác thực vượt giới hạn.');
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(!data || typeof data!=='object' || Array.isArray(data)) return failure(400, 'JSON xác thực phải là một đối tượng.');
    return {data};
  } catch {
    await reader.cancel().catch(()=>{});
    return failure(400, 'JSON xác thực không hợp lệ.');
  } finally { reader.releaseLock(); }
}
