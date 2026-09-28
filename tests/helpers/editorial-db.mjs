import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
export function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(fs.readFileSync('migrations/0002_posts.sql','utf8'));
  sqlite.exec(fs.readFileSync('migrations/0016_editorial_jobs.sql','utf8'));
  sqlite.exec(fs.readFileSync('migrations/0017_media_assets.sql','utf8'));
  sqlite.exec('CREATE TABLE cms_audit_log (actor TEXT, action TEXT, resource TEXT, resource_id TEXT, summary TEXT)');
  const db = { sqlite, prepare(sql) {
    const make = args => ({ bind(...values) { return make(values); },
      async all() { return { results: sqlite.prepare(sql).all(...args) }; },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async run() { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(r.changes),last_row_id:Number(r.lastInsertRowid) } }; },
      execute() { const r = sqlite.prepare(sql).run(...args); return { meta: { changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid) } }; }
    }); return make([]);
  }, async batch(statements) {
    sqlite.exec('BEGIN');
    try { const result=statements.map(s=>s.execute()); sqlite.exec('COMMIT'); return result; }
    catch(error) { sqlite.exec('ROLLBACK'); throw error; }
  } }; return db;
}
