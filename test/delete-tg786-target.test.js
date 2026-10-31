import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
test('production purge source contains exact Hummer target guard',()=>{
 const source=readFileSync(new URL('../scripts/owner-keep-seven-purge.mjs',import.meta.url),'utf8');
 assert.match(source,/x.drop.length===1&&x.drop\[0\].id==='tg-786'/);
});
