-- XTRA autonomous customer-care proposals v1
CREATE TABLE IF NOT EXISTS xtra_customer_care_proposals (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  evidence_episode_id TEXT,
  rationale TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT,
  decided_by TEXT,
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_episode_id) REFERENCES xtra_memory_episodes(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_xtra_care_proposals_customer ON xtra_customer_care_proposals(customer_id,status,created_at DESC);
