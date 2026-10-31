import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../scripts/owner-keep-seven-purge.mjs',import.meta.url),'utf8');
test('keep-seven workflow is explicit and fail-closed',()=>{
  for(const id of ['tg-811','tg-730','tg-714','tg-694','tg-677','tg-605','tg-444']) assert.match(src,new RegExp(id));
  assert.match(src,/status==='available'/);
  assert.match(src,/json_each\(\?1\)/);
  assert.match(src,/decryptBackup/);
  assert.match(src,/encryptedSha256/);
  assert.doesNotMatch(src,/DELETE FROM car_images|DELETE FROM telegram_posts|DELETE FROM leads/i);
});
