import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the deployment function with an API recorder, without evaluating
// the controller's top-level credential checks, uploads or deployment loop.
const source = readFileSync('scripts/deploy-cloudflare-api.mjs','utf8');
const fn = source.slice(source.indexOf('async function ensureCustomDomainRoute()'), source.indexOf('async function verifyVideosPage()'));
const primary = 'phanthuanxtra-v2';
const sitemap = 'phanthuanxtra.com/sitemap.xml';
const patterns = ['phanthuanxtra.com/*','phanthuanxtra.com/','phanthuanxtra.com/home','phanthuanxtra.com/home/','phanthuanxtra.com/api/blog*','phanthuanxtra.com/blog*','phanthuanxtra.com/api/blog/*','phanthuanxtra.com/blog','phanthuanxtra.com/blog/*'];
async function exercise(extra, reject=false) {
  const routes = [...patterns.map((pattern,i)=>({id:String(i),pattern,script:primary})), ...extra];
  const writes=[];
  const reconcile = runInNewContext(fn+'\nensureCustomDomainRoute', {
    WORKER:primary,process:{env:{CLOUDFLARE_ZONE_ID:'fixture-zone'}},console:{log(){}},
    accountPath:path=>'/accounts/fixture'+path,
    api:async(path,options)=>{
      if(!options)return path.endsWith('/routes') ? routes : [];
      writes.push({path,method:options.method,body:JSON.parse(options.body)});
      if(reject)throw Error('fixture route update denied');
      return {};
    }
  });
  await reconcile();return writes;
}
test('GEO repairs existing sitemap ownership in place and preserves backup robots/unrelated routes',async()=>{
  const writes=await exercise([{id:'sitemap-id',pattern:sitemap,script:'phanthuanxtra-backup'},
    {id:'robots-id',pattern:'phanthuanxtra.com/robots.txt',script:'phanthuanxtra-backup'},
    {id:'other-id',pattern:'other.example/*',script:'unrelated'}]);
  assert.deepEqual(writes,[{path:'/zones/fixture-zone/workers/routes/sitemap-id',method:'PUT',body:{pattern:sitemap,script:primary}}]);
});
test('GEO route reconciliation is idempotent and creates a missing sitemap only',async()=>{
  assert.deepEqual(await exercise([{id:'sitemap-id',pattern:sitemap,script:primary}]),[]);
  assert.deepEqual(await exercise([]),[{path:'/zones/fixture-zone/workers/routes',method:'POST',body:{pattern:sitemap,script:primary}}]);
});
test('GEO route update failure prevents deployment success',async()=>{
  await assert.rejects(exercise([{id:'sitemap-id',pattern:sitemap,script:'phanthuanxtra-backup'}],true),/route update denied/);
});
