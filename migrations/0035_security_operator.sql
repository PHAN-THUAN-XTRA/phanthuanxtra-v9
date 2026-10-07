CREATE TABLE IF NOT EXISTS security_operator_state (
  signal_key TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK(state IN ('active','recovered')),
  severity TEXT NOT NULL CHECK(severity IN ('high','critical')),
  fingerprint TEXT NOT NULL,
  summary TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_notified_at TEXT,
  occurrences INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_security_operator_state_state ON security_operator_state(state,last_seen_at);
