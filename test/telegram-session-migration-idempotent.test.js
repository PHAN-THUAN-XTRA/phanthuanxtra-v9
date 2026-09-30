import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("vehicle session migration is safe for production schema", async () => {
  const sql=await readFile(new URL("../migrations/0025_telegram_vehicle_session_manifest.sql",import.meta.url),"utf8");
  assert.match(sql,/CREATE TABLE IF NOT EXISTS telegram_vehicle_sessions/);
  assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_inbox_file_unique_vehicle/);
  assert.doesNotMatch(sql,/ALTER TABLE telegram_inbox ADD COLUMN media_group_id/);
});
