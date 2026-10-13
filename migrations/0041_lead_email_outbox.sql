-- No historical backfill: existing notifications may already have been sent.
CREATE TABLE IF NOT EXISTS xtra_lead_email_outbox (
  notification_id TEXT PRIMARY KEY,
  lead_id INTEGER NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','retry','accepted','delivered','failed','uncertain','blocked')),
  attempts INTEGER NOT NULL DEFAULT 0,
  reconcile_attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER,
  lease_token TEXT,
  provider_message_id TEXT,
  telegram_message_id INTEGER,
  last_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lead_email_due ON xtra_lead_email_outbox(state,next_attempt_at);
