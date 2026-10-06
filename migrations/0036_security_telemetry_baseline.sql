CREATE TABLE IF NOT EXISTS security_telemetry_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sampled_at INTEGER NOT NULL DEFAULT (unixepoch()),
  interval_minutes INTEGER NOT NULL,
  total_requests INTEGER NOT NULL DEFAULT 0,
  error_5xx INTEGER NOT NULL DEFAULT 0,
  error_rate REAL NOT NULL DEFAULT 0,
  waf_events INTEGER NOT NULL DEFAULT 0,
  waf_top_action TEXT,
  waf_top_path TEXT,
  waf_top_country TEXT,
  waf_top_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_telemetry_samples_sampled_at
  ON security_telemetry_samples(sampled_at);
