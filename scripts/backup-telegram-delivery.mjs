import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PART_BYTES = 40 * 1024 * 1024;
export async function splitArchive(file, directory, limit = PART_BYTES) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 49000000) throw new Error('Invalid backup part limit');
  const bytes=await readFile(file); if (!bytes.length) throw new Error('Empty archive');
  await mkdir(directory,{recursive:true}); const parts=[];
  for (let offset=0; offset<bytes.length; offset+=limit) {
    const name='full-system-backup.tar.gz.part'+String(parts.length+1).padStart(3,'0');
    const piece=bytes.subarray(offset,offset+limit); await writeFile(path.join(directory,name),piece);
    parts.push({name,bytes:piece.length,sha256:createHash('sha256').update(piece).digest('hex')});
  }
  return { archive:'full-system-backup.tar.gz', bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex'), parts };
}
export function verifyOwnerChat(chat, expected) {
  if (!chat || chat.type!=='private' || String(chat.id)!==String(expected)) throw new Error('Backup destination is not the verified private owner chat');
}
async function main() {
  const token=process.env.TELEGRAM_BACKUP_BOT_TOKEN, chatId=process.env.TELEGRAM_BACKUP_CHAT_ID;
  const ownerId=process.env.TELEGRAM_BACKUP_OWNER_ID;
  if (!token || !chatId || !ownerId) throw new Error('Telegram owner backup configuration unavailable');
  async function api(method, body) {
    const response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',body,signal:AbortSignal.timeout(120000)});
    const result=await response.json().catch(()=>null);
    if (!response.ok || result?.ok!==true) throw new Error('Telegram '+method+' failed (HTTP '+response.status+')');
    return result.result;
  }
  const recipient=await api('getChat',new URLSearchParams({chat_id:chatId})); verifyOwnerChat(recipient,ownerId);
  if (process.argv.includes('--preflight')) { console.log('Telegram private owner backup destination: PASS'); return; }
  const receipt={source_sha:process.env.GITHUB_SHA,run_id:process.env.GITHUB_RUN_ID,owner_verified:true,documents:[]};
  const root=process.env.BACKUP_ROOT, dir='backup-delivery';
  const manifest=await splitArchive('full-system-backup.tar.gz',dir);
  await writeFile(path.join(dir,'backup-parts.json'),JSON.stringify(manifest,null,2));
  const instructions='PHAN THUAN XTRA BACKUP\nDownload every .partNNN file, backup-parts.json and restore-backup.py to one folder.\nRequires Python 3.12 or newer. Run: python restore-backup.py\nThe script verifies each part and the joined archive SHA-256 before extraction.\nSecret values are excluded. GitHub fallback artifact is encrypted with the configured backup bot credential.\n';
  await writeFile(path.join(dir,'RESTORE.txt'),instructions);
  async function send(file, caption) {
    const form=new FormData(); form.set('chat_id',chatId); form.set('caption',caption);
    form.set('document',new Blob([await readFile(file)]),path.basename(file));
    const result=await api('sendDocument',form); verifyOwnerChat(result.chat,ownerId);
    if (!result.document?.file_id || !result.message_id) throw new Error('Telegram document receipt missing');
    receipt.documents.push({name:path.basename(file),message_id:result.message_id,file_id:result.document.file_id});
    await writeFile('backup-delivery-receipt.json',JSON.stringify(receipt,null,2));
    console.log('Telegram verified document delivered: '+path.basename(file));
    await new Promise(resolve=>setTimeout(resolve,1100));
  }
  for (const part of manifest.parts) await send(path.join(dir,part.name),'Backup archive part '+part.name+'; SHA '+process.env.GITHUB_SHA);
  for (const file of [path.join(dir,'backup-parts.json'),path.join(dir,'RESTORE.txt'),'scripts/restore-backup.py',path.join(root,'manifest.json'),path.join(root,'d1/restore-evidence.json'),'full-system-backup.tar.gz.sha256']) await send(file,'PHAN THUAN XTRA backup restore/evidence');
  const status=await api('sendMessage',new URLSearchParams({chat_id:chatId,text:'Backup PHAN THUẦN XTRA đã gửi đủ '+manifest.parts.length+' phần archive và 6 tệp phục hồi/kiểm chứng. D1 đã phục hồi SQLite kiểm tra thành công; SHA-256 và R2 archive đã kiểm tra. Mã nguồn, D1, R2 và cấu hình production; không gồm secret, queue đang chạy, KV/DO hoặc dữ liệu Worker khác.'}));
  verifyOwnerChat(status.chat,ownerId); receipt.status_message_id=status.message_id;
  await writeFile('backup-delivery-receipt.json',JSON.stringify(receipt,null,2));
  console.log('Telegram full-system backup delivery: PASS');
}
if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) await main();
