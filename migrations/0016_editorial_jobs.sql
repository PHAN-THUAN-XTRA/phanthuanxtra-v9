-- Telegram editorial drafts, batches and schedules; posts remain the publication source.
CREATE TABLE IF NOT EXISTS editorial_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_key TEXT NOT NULL UNIQUE,
  post_id INTEGER NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','pending','published','cancelled')),
  scheduled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_editorial_jobs_due ON editorial_jobs(status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_editorial_jobs_chat ON editorial_jobs(chat_id,id);
