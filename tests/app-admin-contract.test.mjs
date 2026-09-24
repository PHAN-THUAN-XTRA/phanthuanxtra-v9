import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/app-admin.js',import.meta.url),'utf8');
const appApi=fs.readFileSync(new URL('../src/app-api.js',import.meta.url),'utf8');
const androidMain=fs.readFileSync(new URL('../android/app/src/main/java/com/phanthuanxtra/app/MainActivity.java',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0012_leads_management.sql',import.meta.url),'utf8');

test('app admin exposes authenticated lead CRUD contract',()=>{
  assert.match(source,/ADMIN_PASSWORD/);
  assert.match(source,/Bearer/);
  assert.match(source,/GET/);
  assert.match(source,/PUT/);
  assert.match(source,/DELETE/);
  assert.match(source,/status/);
  assert.match(source,/note/);
  assert.match(source,/updated_at/);
  assert.match(source,/ID không hợp lệ/);
  assert.match(source,/request\.method!==\"GET\"&&request\.method!==\"PUT\"&&request\.method!==\"DELETE\"/);
  assert.match(source,/Unauthorized/);
});

test('app admin does not keep a stale ADMIN_PASSWORD fallback after D1 reset',()=>{
  assert.doesNotMatch(source,/!valid&&password===String\(env\.ADMIN_PASSWORD\)/);
  assert.doesNotMatch(source,/if\(!valid\).*password===String\(env\.ADMIN_PASSWORD\)/);
  assert.match(source,/const valid=await verifyAdminPassword\(env,password\)/);
  assert.match(source,/if\(!valid\)return json\(\{error:\"Sai mật khẩu\"\},401\)/);
});

test('password reset and login preserve exact password bytes instead of trimming one side',()=>{
  assert.match(source,/const password=String\(body\.password\?\?\"\"\)/);
  assert.match(source,/const confirm=String\(body\.confirm\?\?\"\"\)/);
  assert.doesNotMatch(source,/const password=String\(body\.password\|\|\"\"\)\.trim\(\)/);
});

test('app admin exposes authenticated R2 media delete with key allowlist',()=>{
  assert.match(source,/handleMediaDelete/);
  assert.match(source,/MEDIA_KEY_RE/);
  assert.match(source,/env\.MEDIA\.delete\(key\)/);
  assert.match(source,/key\.includes\("\.\."\)/);
  assert.match(source,/u\.pathname\.startsWith\("\/api\/admin\/media\/"\)/);
});

test('lead management migration adds operational fields without dropping data',()=>{
  assert.match(migration,/ALTER TABLE leads ADD COLUMN status/);
  assert.match(migration,/ALTER TABLE leads ADD COLUMN note/);
  assert.match(migration,/ALTER TABLE leads ADD COLUMN updated_at/);
  assert.doesNotMatch(migration,/DROP TABLE|DROP COLUMN/);
});

test('admin control reuses the authenticated session instead of asking for ADMIN_TOKEN',()=>{
  const control=fs.readFileSync(new URL('../public/admin-control.html',import.meta.url),'utf8');
  assert.doesNotMatch(control,/<label>ADMIN_TOKEN<\/label>/);
  assert.doesNotMatch(control,/id="token"/);
  assert.match(control,/let token=sessionStorage\.getItem\('ptx_admin_token'\)\|\|''/);
  assert.match(control,/if\(!token\)\{location\.replace\('\/admin'\);return\}/);
  assert.match(control,/login\(\);/);
});


test('Android operator app uses the canonical App API namespace with signed Admin-session login',()=>{
  assert.match(androidMain,/BASE="https:\/\/phanthuanxtra\.com\/api\/app\/v1"/);
  assert.doesNotMatch(androidMain,/BASE="https:\/\/phanthuanxtra\.com\/api\/admin"/);
  assert.match(appApi,/\/api\/app\/v1\/login/);
  assert.match(appApi,/verifyAdminPassword/);
  assert.match(appApi,/issueAdminToken/);
  assert.match(appApi,/verifyAdminToken/);
  assert.match(appApi,/await auth\(r,e\)/);
  assert.match(appApi,/APP_API_TOKEN/);
});


test('App API exposes authenticated native AI assistant with free-first fallback chain', () => {
  assert.match(appApiSource, /\/api\/app\/v1\/assistant/);
  assert.match(appApiSource, /@cf\/meta\/llama-3\.1-8b-instruct-fast/);
  assert.match(appApiSource, /@cf\/qwen\/qwen3\.8-27b/);
  assert.match(appApiSource, /rejectIfBusy:true/);
});

test('Android operator hub exposes XTRA AI Assistant through App API', () => {
  assert.match(mainActivitySource, /XTRA AI ASSISTANT/);
  assert.match(mainActivitySource, /"\/assistant"/);
});
