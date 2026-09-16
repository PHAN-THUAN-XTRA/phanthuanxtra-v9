import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/app-admin.js',import.meta.url),'utf8');
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