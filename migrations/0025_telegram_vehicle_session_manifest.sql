-- Persistent Telegram vehicle sessions prevent cross-vehicle photo mixing.
CREATE TABLE IF NOT EXISTS telegram_vehicle_sessions (
  chat_id TEXT PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  opened_message_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_inbox_file_unique_vehicle
ON telegram_inbox(chat_id,file_unique_id)
WHERE file_unique_id <> '';
