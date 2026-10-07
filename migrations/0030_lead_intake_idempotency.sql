CREATE TABLE IF NOT EXISTS xtra_lead_intake_requests (
  idempotency_key TEXT PRIMARY KEY,
  lead_id INTEGER,
  customer_id TEXT,
  source TEXT NOT NULL DEFAULT 'website-lead',
  payload_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'claimed',
  delivery_ok INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  last_error TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_xtra_lead_intake_status
ON xtra_lead_intake_requests(status,updated_at DESC);
