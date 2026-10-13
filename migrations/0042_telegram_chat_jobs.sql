-- One durable Auto Bot /chat record per original Telegram update.
CREATE TABLE IF NOT EXISTS xtra_telegram_chat_jobs (
  job_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  source_message_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','generating','ready','sending','sent','uncertain','blocked')),
  attempts INTEGER NOT NULL DEFAULT 0,
  send_attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_until INTEGER,
  answer TEXT,
  error_code TEXT,
  telegram_reply_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_id,source_message_id)
);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_due ON xtra_telegram_chat_jobs(state,next_attempt_at);
