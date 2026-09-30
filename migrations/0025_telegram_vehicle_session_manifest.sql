-- Persistent Telegram vehicle sessions prevent cross-vehicle photo mixing.
CREATE TABLE IF NOT EXISTS telegram_vehicle_sessions (
  chat_id TEXT PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  opened_message_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- New-session media identity avoids imposing uniqueness on legacy telegram_inbox rows.
CREATE TABLE IF NOT EXISTS telegram_vehicle_session_media (
  session_key TEXT NOT NULL,
  file_unique_id TEXT NOT NULL,
  inbox_id INTEGER,
  media_group_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(session_key,file_unique_id)
);
