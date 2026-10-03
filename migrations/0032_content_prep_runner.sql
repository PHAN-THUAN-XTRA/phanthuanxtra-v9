-- Checkpoints contain briefs/results, never delegated credentials.
CREATE TABLE IF NOT EXISTS xtra_content_runs (
  run_key TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  input_json TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'generate' CHECK(stage IN ('generate','draft','schedule','done')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('ready','running','retry','blocked','completed')),
  output_json TEXT,
  draft_json TEXT,
  result_json TEXT,
  stage_attempts INTEGER NOT NULL DEFAULT 0 CHECK(stage_attempts BETWEEN 0 AND 3),
  generation_calls INTEGER NOT NULL DEFAULT 0 CHECK(generation_calls BETWEEN 0 AND 3),
  lease_token TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pipeline_id,request_id)
);
CREATE TABLE IF NOT EXISTS xtra_content_model_calls (
  call_id TEXT PRIMARY KEY,
  run_key TEXT NOT NULL REFERENCES xtra_content_runs(run_key),
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_calls_day ON xtra_content_model_calls(day);
CREATE INDEX IF NOT EXISTS idx_content_runs_pipeline ON xtra_content_runs(pipeline_id,created_at);
