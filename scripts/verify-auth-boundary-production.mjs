// Negative-only checks: no real credentials, password reset, or database writes.
const base='https://phanthuanxtra.com';
const paths=['/api/admin/login','/api/admin/forgot-password','/api/admin/recovery/rotate','/api/app/v1/login'];
for(const path of paths) {
  for(const [body,expected] of [['null',400],[JSON.stringify({password:'x'.repeat(9000)}),413]]) {
    const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body,
      redirect:'error',signal:AbortSignal.timeout(20000)});
    const result=await response.json();
    if(response.status!==expected || typeof result.error!=='string' || response.headers.get('cache-control')!=='no-store') {
      throw Error('Authentication input boundary failed: '+path+' expected '+expected+', received '+response.status);
    }
    console.log(path+' rejects '+(expected===400?'non-object JSON':'oversized JSON')+': HTTP '+expected);
  }
}
console.log('Authentication request boundaries: PASS; no credentials or mutations used.');
