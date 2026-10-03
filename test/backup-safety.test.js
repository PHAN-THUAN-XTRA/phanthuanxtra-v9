import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,rm,access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { verifyD1Backup,encryptBackup,decryptBackup } from '../scripts/backup-safety.mjs';
import { splitArchive,verifyOwnerChat } from '../scripts/backup-telegram-delivery.mjs';
const temp=()=>mkdtemp(path.join(os.tmpdir(),'ptx-backup-test-'));
const schema=['cars','car_images','posts','leads','customers','xtra_content_prep_requests','xtra_content_owner_operations'].map(x=>'CREATE TABLE '+x+'(id INTEGER PRIMARY KEY,content TEXT);').join('\n');
test('D1 backup restores real UTF-8 rows and rejects schema-only data loss',async()=>{
 const dir=await temp();try{
  const file=path.join(dir,'db.sql');await writeFile(file,schema);await assert.rejects(verifyD1Backup(file),/no vehicle data/);
  await writeFile(file,schema+"INSERT INTO cars VALUES(1,'Phan Thuần');INSERT INTO car_images VALUES(1,'ảnh');INSERT INTO customers VALUES(1,'Khách');");
  const proof=await verifyD1Backup(file);assert.equal(proof.integrity_check,'ok');assert.equal(proof.row_counts.customers,1);assert.equal(proof.table_count,7);
  await writeFile(file,'bad SQL');await assert.rejects(verifyD1Backup(file));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('fallback archive encryption authenticates ciphertext and never writes a wrong-key restore',async()=>{
 const dir=await temp();try{
  const plain=path.join(dir,'archive'),enc=path.join(dir,'encrypted'),out=path.join(dir,'restored');await writeFile(plain,'private customer SQL');
  await encryptBackup(plain,enc,'synthetic-credential');assert.ok(!(await readFile(enc)).includes(Buffer.from('private customer')));
  await assert.rejects(decryptBackup(enc,out,'wrong-credential'));await assert.rejects(access(out));
  await decryptBackup(enc,out,'synthetic-credential');assert.deepEqual(await readFile(out),await readFile(plain));
  const bytes=await readFile(enc);bytes[bytes.length-1]^=1;await writeFile(enc,bytes);await assert.rejects(decryptBackup(enc,out,'synthetic-credential'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('multipart Telegram backup joins byte-exactly and records every part hash',async()=>{
 const dir=await temp();try{
  const file=path.join(dir,'archive'),data=Buffer.from('0123456789Phan Thuần');await writeFile(file,data);
  const manifest=await splitArchive(file,path.join(dir,'parts'),7);assert.equal(manifest.parts.length,Math.ceil(data.length/7));
  const pieces=await Promise.all(manifest.parts.map(p=>readFile(path.join(dir,'parts',p.name))));assert.deepEqual(Buffer.concat(pieces),data);
  assert.ok(manifest.parts.every(p=>p.bytes<=7&&/^[a-f0-9]{64}$/.test(p.sha256)));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('backup transfer rejects groups, channels and any other private user',()=>{
 verifyOwnerChat({id:6451516147,type:'private'},'6451516147');
 for(const chat of [{id:6451516147,type:'group'},{id:99,type:'private'},{id:-1,type:'channel'}])assert.throws(()=>verifyOwnerChat(chat,'6451516147'));
});
