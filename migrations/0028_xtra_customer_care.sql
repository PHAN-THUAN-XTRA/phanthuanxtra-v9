-- Telegram Customer Care Agent v1
-- Extends XTRA Memory Brain with owner-managed care state; customer identity remains in xtra_memory_customers.
CREATE TABLE IF NOT EXISTS xtra_customer_care (
  customer_id TEXT PRIMARY KEY,
  care_status TEXT NOT NULL DEFAULT 'new',
  note TEXT NOT NULL DEFAULT '',
  follow_up_at TEXT,
  ai_summary TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xtra_customer_care_followup ON xtra_customer_care(care_status, follow_up_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS xtra_customer_care_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xtra_customer_care_audit_customer ON xtra_customer_care_audit(customer_id, created_at DESC, id DESC);
