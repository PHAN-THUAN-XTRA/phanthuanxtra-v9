CREATE TABLE IF NOT EXISTS openai_weekly_digest_runs (
  week_key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  last_error TEXT,
  telegram_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);
