CREATE TABLE IF NOT EXISTS xtra_content_prep_requests (
  request_key TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  agent_id TEXT NOT NULL CHECK (agent_id IN ('agent-11','agent-19')),
  action TEXT NOT NULL CHECK (action IN ('create-draft','prepare-schedule')),
  payload_fingerprint TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  post_id INTEGER,
  draft_revision TEXT,
  proposed_at TEXT,
  review_state TEXT CHECK (review_state IS NULL OR review_state='proposed'),
  status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','completed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  UNIQUE (pipeline_id,request_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  CHECK ((action='create-draft' AND agent_id='agent-11' AND proposed_at IS NULL AND review_state IS NULL)
    OR (action='prepare-schedule' AND agent_id='agent-19' AND proposed_at IS NOT NULL AND review_state='proposed'))
);
CREATE INDEX IF NOT EXISTS idx_content_prep_pipeline
ON xtra_content_prep_requests(pipeline_id,created_at DESC);
