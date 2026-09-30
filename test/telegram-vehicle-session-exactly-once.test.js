import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("vehicle-session ingest remains exactly-once", async () => {
  const ingest=await readFile(new URL("../src/telegram-ingest.js",import.meta.url),"utf8");
  const migration=await readFile(new URL("../migrations/0025_telegram_vehicle_session_manifest.sql",import.meta.url),"utf8");
  assert.match(ingest,/ON CONFLICT\(source_hash\) DO NOTHING/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS telegram_vehicle_session_media/);
  assert.match(migration,/PRIMARY KEY\(session_key,file_unique_id\)/);
  assert.doesNotMatch(migration,/CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_inbox_file_unique_vehicle/);
  assert.match(ingest,/SELECT inbox_id FROM telegram_vehicle_session_media WHERE session_key=\? AND file_unique_id=\?/);
  assert.match(ingest,/INSERT OR IGNORE INTO telegram_vehicle_session_media\(session_key,file_unique_id,inbox_id,media_group_id,created_at\)/);
  assert.match(ingest,/SELECT session_key FROM telegram_vehicle_sessions WHERE chat_id=\? AND status='open'/);
  assert.doesNotMatch(ingest,/prepare\(`INSERT INTO telegram_inbox/);
});
