// Owner-authorized one-shot physical removal of hidden CAR rows only.
// R2 media, car_images and Telegram/audit/CRM history are deliberately retained.
// This tool fails closed before any DELETE unless encrypted recoverable backup was uploaded.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptBackup, decryptBackup } from './backup-safety.mjs';

const EXPECTED = Object.freeze({ all: 197, available: 8, hidden: 189 });
const DB_ID = '8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d';
const BASE = 'https://api.cloudflare.com/client/v4/accounts/';
const DIR = 'owner-hidden-purge-backup';
const digest = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value);
const assert = (condition, message) => { if (!condition) throw Error('PURGE_HOLD: ' + message); };

export function validateFleet(cars) {
  assert(Array.isArray(cars), 'inventory not an array');
  const ids = new Set(), available = [], hidden = [];
  for (const car of cars) {
    assert(car && typeof car.id === 'string' && /^[a-z0-9_-]{3,81}$/i.test(car.id), 'invalid car ID');
    assert(!ids.has(car.id), 'duplicate car ID');
    ids.add(car.id);
    if (car.status === 'available') available.push(car);
    else if (car.status === 'hidden') hidden.push(car);
    else throw Error('PURGE_HOLD: unsupported car status found; no deletion permitted');
  }
  assert(cars.length === EXPECTED.all, 'fleet total drift; expected 197');
  assert(available.length === EXPECTED.available, 'available count drift; expected 8');
  assert(hidden.length === EXPECTED.hidden, 'hidden count drift; expected 189');
  const protectedCar = available.find(car => car.id === 'tg-811');
  assert(protectedCar && Number(protectedCar.price) === 7680000000 &&
    String(protectedCar.category) === 'Sedan', 'protected tg-811 changed');
  return { available, hidden };
}

export function buildGuardedDelete(hiddenIds) {
  assert(Array.isArray(hiddenIds) && hiddenIds.length === EXPECTED.hidden, 'exact hidden ID list required');
  assert(new Set(hiddenIds).size === EXPECTED.hidden, 'hidden ID list contains duplicate');
  assert(hiddenIds.every(id => typeof id === 'string' && /^[a-z0-9_-]{3,81}$/i.test(id)), 'invalid hidden ID');
  assert(!hiddenIds.includes('tg-811'), 'protected vehicle in delete set');
  // D1 supports at most 100 bound variables per statement. The prior 378
  // placeholders failed HTTP 400 without deleting a row (run 41186103228).
  // json_each(?1) expands the exact, already verified ID snapshot atomically.
  const idsAsJson = JSON.stringify(hiddenIds);
  const selected = "SELECT value FROM json_each(?1)";
  return {
    sql: "DELETE FROM cars WHERE status='hidden' AND id IN (" + selected + ")" +
      " AND (SELECT COUNT(*) FROM cars)=197" +
      " AND (SELECT COUNT(*) FROM cars WHERE status='available')=8" +
      " AND (SELECT COUNT(*) FROM cars WHERE status='hidden')=189" +
      " AND (SELECT COUNT(*) FROM cars WHERE status='hidden' AND id IN (" + selected + "))=189" +
      " AND (SELECT COUNT(*) FROM cars WHERE id='tg-811' AND status='available' AND category='Sedan' AND price=7680000000)=1",
    params: [idsAsJson]
  };
}

function endpoint() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  assert(/^[a-f0-9]{32}$/i.test(account), 'Cloudflare account not configured');
  return BASE + account + '/d1/database/' + DB_ID + '/query';
}

async function callQuery(sql, params=[], write=false) {
  const tokens = [process.env.CLOUDFLARE_API_TOKEN, process.env.CLOUDFLARE_BACKUP_API_TOKEN].filter(Boolean);
  assert(tokens.length > 0, 'D1 API credential unavailable');
  assert(write ? /^DELETE FROM cars /i.test(sql) : /^SELECT /i.test(sql), 'SQL safety violation');
  let last='NO_CREDENTIAL';
  for (const token of tokens) {
    const response = await fetch(endpoint(), {
      method:'POST', redirect:'error',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({sql,params}),
      signal:AbortSignal.timeout(30000)
    });
    if (response.status === 401 || response.status === 403) {
      last='HTTP_'+response.status; continue;
    }
    if (!response.ok) throw Error('PURGE_HOLD: D1 HTTP '+response.status);
    const envelope = await response.json().catch(()=>null);
    assert(envelope?.success === true && Array.isArray(envelope.result) &&
      envelope.result.length === 1 && envelope.result[0]?.success === true, 'D1 API rejected statement');
    const result = envelope.result[0];
    if (!write) assert((result.meta?.changes || 0) === 0 &&
      (result.meta?.rows_written || 0) === 0, 'read-only query reported a write');
    return result;
  }
  throw Error('PURGE_HOLD: D1 token not authorized ('+last+')');
}
const readCars = async () => {
  const result = await callQuery('SELECT * FROM cars ORDER BY id');
  assert(Array.isArray(result.results), 'D1 inventory rows missing');
  return result.results;
};
const readHiddenImages = async () => {
  const result = await callQuery(
    "SELECT * FROM car_images WHERE car_id IN (SELECT id FROM cars WHERE status='hidden') ORDER BY car_id,sort_order,id"
  );
  assert(Array.isArray(result.results), 'gallery rows missing');
  return result.results;
};

async function prepare() {
  assert(process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF === 'refs/heads/main',
    'production push-only safeguard');
  assert(process.env.TELEGRAM_BACKUP_BOT_TOKEN, 'backup encryption key unavailable');
  await mkdir(DIR,{recursive:true,mode:0o700});
  const cars=await readCars();
  const {available,hidden}=validateFleet(cars);
  const hiddenImages=await readHiddenImages();
  assert(hiddenImages.every(image=>hidden.some(car=>car.id===image.car_id)), 'gallery linkage invalid');
  const snapshot={schema:'xtra.hidden.vehicle.delete.v1',time:new Date().toISOString(),
    runId:process.env.GITHUB_RUN_ID,sha:process.env.GITHUB_SHA,
    hidden,hiddenImages,available};
  const raw=Buffer.from(JSON.stringify(snapshot));
  const hash=digest(raw);
  const rawPath=DIR+'/original.json', encPath=DIR+'/hidden-vehicles.enc';
  await writeFile(rawPath,raw,{mode:0o600});
  await encryptBackup(rawPath,encPath,process.env.TELEGRAM_BACKUP_BOT_TOKEN);
  await decryptBackup(encPath,DIR+'/restore-check.json',process.env.TELEGRAM_BACKUP_BOT_TOKEN);
  const verified=await readFile(DIR+'/restore-check.json');
  assert(digest(verified) === hash,'encrypted backup cannot be decrypted identically');
  const parsed=JSON.parse(verified.toString('utf8'));
  assert(parsed.hidden.length===189 && parsed.available.length===8 &&
    parsed.hiddenImages.length===hiddenImages.length,'restored snapshot count mismatch');
  const enc=await readFile(encPath);
  const receipt={schema:'xtra.hidden.vehicle.backup.receipt.v1',
    sha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,
    hidden:189,available:8,imagesPreserved:hiddenImages.length,
    plaintextSha256:hash,encryptedSha256:digest(enc),createdAt:snapshot.time};
  await writeFile(DIR+'/receipt.json',JSON.stringify(receipt,null,2));
  await rm(rawPath);await rm(DIR+'/restore-check.json');
  console.log('ENCRYPTED_BACKUP_RESTORE_VERIFIED hidden=189 available=8; no D1 writes');
}

async function execute() {
  assert(process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF === 'refs/heads/main',
    'production push-only safeguard');
  assert(process.env.TELEGRAM_BACKUP_BOT_TOKEN,'backup key unavailable');
  const path='verified-upload/hidden-vehicles.enc';
  const receipt=JSON.parse(await readFile('verified-upload/receipt.json','utf8'));
  const encrypted=await readFile(path);
  assert(digest(encrypted) === receipt.encryptedSha256, 'uploaded backup digest mismatch');
  await decryptBackup(path,DIR+'/verified-snapshot.json',process.env.TELEGRAM_BACKUP_BOT_TOKEN);
  const raw=await readFile(DIR+'/verified-snapshot.json');
  assert(digest(raw) === receipt.plaintextSha256,'uploaded backup decrypt/hash failed');
  const saved=JSON.parse(raw.toString('utf8'));
  assert(saved.runId===process.env.GITHUB_RUN_ID && saved.sha===process.env.GITHUB_SHA,
    'backup belongs to different run/commit');
  assert(Date.now()-Date.parse(saved.time) < 30*60*1000,'backup stale (>30 minutes)');
  assert(saved.hidden.length===189 && saved.available.length===8,'backup counts invalid');
  const nowCars=await readCars();
  validateFleet(nowCars);
  const currentAvailable=nowCars.filter(x=>x.status==='available');
  const currentHidden=nowCars.filter(x=>x.status==='hidden');
  assert(stable(currentAvailable) === stable(saved.available) &&
    stable(currentHidden) === stable(saved.hidden),
    'cars changed since encrypted backup; refuse deletion');
  assert(stable(await readHiddenImages())===stable(saved.hiddenImages),
    'hidden gallery changed since backup; refuse deletion');
  const statement=buildGuardedDelete(saved.hidden.map(x=>x.id));
  const result=await callQuery(statement.sql,statement.params,true);
  // The guarded DELETE is a single atomic SQL statement. A missing row is not a success.
  const changes=Number(result.meta?.changes ?? -1);
  assert(changes===189,'D1 deletion count not 189');
  const after=await readCars();
  assert(after.length===8 && after.every(x=>x.status==='available'),
    'post-delete inventory must contain eight available cars only');
  assert(stable(after)===stable(saved.available),'available car rows changed after delete');
  const publicResult=await fetch('https://phanthuanxtra.com/api/cars',{redirect:'error',signal:AbortSignal.timeout(12000)});
  assert(publicResult.status===200,'public car endpoint unavailable');
  const publicData=await publicResult.json();
  assert(Array.isArray(publicData?.cars) && !publicData.cars.some(x=>saved.hidden.some(y=>y.id===x.id)),
    'hidden vehicle remains public');
  const summary={result:'OWNER_HIDDEN_CARS_DELETED',deletedCars:189,
    remainingAvailable:8,remainingHidden:0,
    galleryAndR2PhysicallyDeleted:false,
    encryptedBackupVerified:true,encryptedBackupArtifactUploaded:true,
    backupImageRows:saved.hiddenImages.length,
    protectedTg811:true,productionData:'D1 cars only'};
  console.log('OWNER_PURGE_RECEIPT '+JSON.stringify(summary));
  await writeFile(DIR+'/execution-receipt.json',JSON.stringify(summary,null,2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const {appendFile}=await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY,
      '### Owner-hidden car removal — verified\n\n' +
      'Deleted: 189 hidden vehicle rows; kept: 8 available. '+
      'Encrypted archive uploaded and checked. Gallery/R2/Telegram history retained.\n');
  }
  await rm(DIR+'/verified-snapshot.json');
}

const mode=process.argv[2];
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(mode==='prepare')await prepare();
  else if(mode==='execute')await execute();
  else throw Error('Expected prepare or execute mode');
}
