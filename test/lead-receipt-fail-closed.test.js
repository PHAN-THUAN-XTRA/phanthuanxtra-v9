import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker from '../src/index.js';

const request = phone => new Request('https://example.com/api/leads', {
  method: 'POST', headers: {'content-type':'application/json'},
  body: JSON.stringify({phone})
});
test('lead intake without D1 returns an explicit non-storage failure', async () => {
  const response = await worker.fetch(request('0900000000'), {}, {});
  assert.equal(response.status, 503);
  const receipt = await response.json();
  assert.equal(receipt.ok, false);
  assert.equal(receipt.stored, false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('invalid lead input is rejected before storage', async () => {
  const response = await worker.fetch(request('1'), {}, {});
  assert.equal(response.status, 400);
});

const source = fs.readFileSync(new URL('../public/script.js', import.meta.url), 'utf8');
const formCode = source.slice(source.indexOf('const leadForm='), source.indexOf('\n', source.indexOf('const leadForm=')));
async function submit(receipt, httpOk = true) {
  const status = {textContent: ''};
  let resets = 0;
  const form = {reset() { resets++; }};
  const context = vm.createContext({
    $: selector => selector === '#leadForm' ? form : status,
    FormData: class {get(key) {return key === 'phone' ? '0900000000' : ''; }},
    visitorId: 'fixture', fetch: async () => ({ok:httpOk, json:async () => receipt})
  });
  vm.runInContext(formCode, context);
  await form.onsubmit({preventDefault(){}});
  return {resets, message:status.textContent};
}
for (const [name, receipt, httpOk] of [
  ['legacy false storage', {ok:true,stored:false}, true],
  ['missing storage receipt', {ok:true}, true],
  ['non-boolean receipt', {ok:true,stored:'true'}, true],
  ['API refusal', {ok:false,stored:true}, true],
  ['HTTP failure', {ok:true,stored:true}, false]
]) test(`public form preserves input on ${name}`, async () => {
  const result = await submit(receipt, httpOk);
  assert.equal(result.resets, 0);
  assert.match(result.message, /Chưa gửi được/);
});
test('public form acknowledges and clears only confirmed stored lead', async () => {
  const result = await submit({ok:true,stored:true});
  assert.equal(result.resets, 1);
  assert.match(result.message, /Đã nhận yêu cầu/);
});
