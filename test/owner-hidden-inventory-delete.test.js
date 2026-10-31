import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { validateFleet, buildGuardedDelete } from '../scripts/owner-hidden-inventory-delete.mjs';

function fixture() {
  const cars = Array.from({length:189}, (_, i) => ({
    id:'hidden-'+String(i+1).padStart(3,'0'), status:'hidden', price:1
  }));
  const available = Array.from({length:8},(_,i) => ({
    id:i===7?'tg-811':'available-'+String(i+1).padStart(3,'0'),
    status:'available',
    price:i===7?7680000000:123,
    category:i===7?'Sedan':'SUV'
  }));
  return [...cars,...available].sort((a,b)=>a.id.localeCompare(b.id));
}

test('exact owner request: retain eight available while targeting 189 hidden',()=>{
  const result=validateFleet(fixture());
  assert.equal(result.available.length,8);
  assert.equal(result.hidden.length,189);
  assert.ok(result.available.some(c=>c.id==='tg-811'));
  assert.ok(result.hidden.every(c=>c.id!=='tg-811'));
});

test('fail closed on all count, status, duplicated ID or protected car drift',()=>{
  const rows=fixture();
  assert.throws(()=>validateFleet(rows.slice(0,196)),/PURGE_HOLD/);
  const drift=structuredClone(rows);drift.find(car=>car.status==='hidden').status='available';
  assert.throws(()=>validateFleet(drift),/PURGE_HOLD/);
  const duplicate=structuredClone(rows);duplicate[0].id=duplicate[1].id;
  assert.throws(()=>validateFleet(duplicate),/PURGE_HOLD/);
  const protectedDrift=structuredClone(rows);
  protectedDrift.find(c=>c.id==='tg-811').price=1;
  assert.throws(()=>validateFleet(protectedDrift),/PURGE_HOLD/);
});

test('single guarded SQL statement can remove only the exact hidden list',()=>{
  const ids=validateFleet(fixture()).hidden.map(x=>x.id);
  const result=buildGuardedDelete(ids);
  assert.match(result.sql,/^DELETE FROM cars WHERE status='hidden' AND id IN/);
  assert.match(result.sql,/COUNT\(\*\) FROM cars\)=197/);
  assert.match(result.sql,/status='available'\)=8/);
  assert.match(result.sql,/status='hidden'\)=189/);
  assert.match(result.sql,/id='tg-811'/);
  assert.equal(result.params.length,1,'Cloudflare D1 allows at most 100 parameters');
  assert.deepEqual(JSON.parse(result.params[0]),ids);
  assert.equal((result.sql.match(/json_each\(\?1\)/g)||[]).length,2);
  assert.doesNotMatch(result.sql,/DELETE FROM car_images|DROP TABLE|DELETE FROM telegram_posts/i);
  assert.throws(()=>buildGuardedDelete([...ids.slice(0,188),'tg-811']),/PURGE_HOLD/);
});

test('workflow is one-shot main push with verified encrypted GitHub artifact before deletion',()=>{
  const yaml=readFileSync(new URL('../.github/workflows/owner-hidden-inventory-purge.yml', import.meta.url),'utf8');
  const script=readFileSync(new URL('../scripts/owner-hidden-inventory-delete.mjs',import.meta.url),'utf8');
  assert.match(yaml,/branches: \[main\]/);
  assert.match(yaml,/owner-purge-hidden-189/);
  assert.match(yaml,/environment: production/);
  assert.match(yaml,/Read-only inventory preflight and verified encrypted snapshot/);
  assert.match(yaml,/actions\/upload-artifact@v4/);
  assert.match(yaml,/actions\/download-artifact@v4/);
  assert.ok(yaml.indexOf('actions/upload-artifact@v4')<yaml.indexOf('scripts/owner-hidden-inventory-delete.mjs execute'));
  assert.match(yaml,/retention-days: 90/);
  assert.match(script,/digest\(encrypted\) === receipt.encryptedSha256/);
  assert.match(script,/decryptBackup\(path/);
  assert.match(script,/stable\(currentHidden\) === stable\(saved.hidden\)/);
  assert.match(script,/stable\(after\)===stable\(saved.available\)/);
  assert.doesNotMatch(yaml,/\bwrangler\b/i);
  assert.doesNotMatch(script,/DELETE FROM car_images|DELETE FROM telegram_posts|DELETE FROM leads/);
});


test('execute actual atomic JSON_each D1-compatible SQL on disposable SQLite clone',()=>{
  function local() {
    const db=new DatabaseSync(':memory:');
    db.exec('CREATE TABLE cars (id TEXT PRIMARY KEY, status TEXT, price INTEGER, category TEXT)');
    const stmt=db.prepare('INSERT INTO cars (id,status,price,category) VALUES (?,?,?,?)');
    for(const row of fixture())stmt.run(row.id,row.status,row.price,row.category||null);
    return db;
  }
  const ids=validateFleet(fixture()).hidden.map(x=>x.id);
  const {sql,params}=buildGuardedDelete(ids);
  const db=local();
  try {
    const before=db.prepare("SELECT COUNT(*) AS n FROM cars").get();
    assert.equal(before.n,197);
    const changes=db.prepare(sql).run(...params);
    assert.equal(changes.changes,189,'one atomic statement removes all expected hidden rows');
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM cars WHERE status='hidden'").get().n,0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM cars WHERE status='available'").get().n,8);
    assert.equal(db.prepare("SELECT price FROM cars WHERE id='tg-811'").get().price,7680000000);
  } finally { db.close(); }

  const driftDb=local();
  try {
    driftDb.prepare("UPDATE cars SET status='reserved' WHERE id=?").run(ids[0]);
    const changes=driftDb.prepare(sql).run(...params);
    assert.equal(changes.changes,0,'different source data must result in no rows removed');
    assert.equal(driftDb.prepare('SELECT COUNT(*) AS n FROM cars').get().n,197);
  } finally { driftDb.close(); }

  const mismatchDb=local();
  try {
    const mismatched=buildGuardedDelete(ids.map((id,i)=>i===0?'hidden-999':id));
    assert.equal(mismatchDb.prepare(mismatched.sql).run(...mismatched.params).changes,0);
    assert.equal(mismatchDb.prepare('SELECT COUNT(*) AS n FROM cars').get().n,197);
  } finally { mismatchDb.close(); }
});
