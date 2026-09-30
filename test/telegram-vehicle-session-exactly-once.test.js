import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("vehicle-session ingest remains exactly-once", async () => {
  const ingest=await readFile(new URL("../src/telegram-ingest.js",import.meta.url),"utf8");
  const migration=await readFile(new URL("../migrations/0025_telegram_vehicle_session_manifest.sql",import.meta.url),"utf8");
  assert.match(ingest,/ON CONFLICT\(source_hash\) DO NOTHING/);
  assert.match(ingest,/file_unique_id/);
  assert.match(migration,/UNIQUE INDEX[\s\S]*chat_id,file_unique_id/);
  assert.match(ingest,/SELECT session_key FROM telegram_vehicle_sessions WHERE chat_id=\? AND status='open'/);
  assert.doesNotMatch(ingest,/prepare\(`INSERT INTO telegram_inbox/);
});
