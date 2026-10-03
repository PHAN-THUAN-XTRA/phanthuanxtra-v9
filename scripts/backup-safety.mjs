import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function verifyD1Backup(file) {
  const db = new DatabaseSync(':memory:');
  try {
    const sql = await readFile(file, 'utf8');
    if (!sql.trim()) throw new Error('Empty D1 export');
    db.exec(sql);
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('D1 restore integrity failed');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all();
    const counts = Object.fromEntries(tables.map(({name}) => [name, db.prepare('SELECT COUNT(*) n FROM "' + name.replaceAll('"','""') + '"').get().n]));
    for (const table of ['cars', 'car_images', 'posts', 'leads', 'customers', 'xtra_content_prep_requests', 'xtra_content_owner_operations']) {
      if (!Object.hasOwn(counts, table)) throw new Error('Required D1 table missing: ' + table);
    }
    if (!counts.cars || !counts.car_images) throw new Error('Production D1 export contains no vehicle data');
    return { method: 'clean-local-sqlite-restore', integrity_check: 'ok', table_count: tables.length, row_counts: counts };
  } finally { db.close(); }
}
const magic = Buffer.from('PTXBACKUP1');
export async function encryptBackup(input, output, secret) {
  if (!secret) throw new Error('Backup encryption credential unavailable');
  const salt = randomBytes(16), iv = randomBytes(12), key = scryptSync(secret, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(magic);
  const data = Buffer.concat([cipher.update(await readFile(input)), cipher.final()]);
  await writeFile(output, Buffer.concat([magic,salt,iv,cipher.getAuthTag(),data]));
}
export async function decryptBackup(input, output, secret) {
  if (!secret) throw new Error('Backup decryption credential unavailable');
  const bytes = await readFile(input);
  if (!bytes.subarray(0,magic.length).equals(magic)) throw new Error('Invalid encrypted backup');
  const start=magic.length, key=scryptSync(secret,bytes.subarray(start,start+16),32);
  const cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(start+16,start+28));
  cipher.setAAD(magic); cipher.setAuthTag(bytes.subarray(start+28,start+44));
  const plain=Buffer.concat([cipher.update(bytes.subarray(start+44)),cipher.final()]);
  await writeFile(output,plain);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [mode,input,output]=process.argv.slice(2), secret=process.env.TELEGRAM_BACKUP_BOT_TOKEN;
  if (mode==='encrypt') await encryptBackup(input,output,secret);
  else if (mode==='decrypt') await decryptBackup(input,output,secret);
  else if (mode==='verify') console.log(JSON.stringify(await verifyD1Backup(input)));
  else throw new Error('Unknown backup safety operation');
}
