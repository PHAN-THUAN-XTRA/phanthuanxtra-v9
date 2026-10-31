import assert from 'node:assert/strict';
import test from 'node:test';
const source=await (await import('../scripts/owner-keep-seven-purge.mjs')).default?.catch?.(()=>null);
test('production purge source contains exact Hummer target guard',()=>{
  assert.match(String(source??''),/tg-786/);
});
