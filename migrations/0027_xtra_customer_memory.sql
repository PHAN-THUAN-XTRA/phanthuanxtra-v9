-- XTRA Memory Brain v1
-- Namespaced to avoid collisions with any pre-existing CRM/customer schema.
-- Customer Identity + Episodic Memory + Semantic Facts + durable job idempotency.

CREATE TABLE IF NOT EXISTS xtra_memory_customers (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_xtra_memory_customers_last_seen ON xtra_memory_customers(last_seen_at DESC);

CREATE TABLE IF NOT EXISTS xtra_memory_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  identity_type TEXT NOT NULL,
  identity_value TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(identity_type, identity_value),
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xtra_memory_identities_customer ON xtra_memory_identities(customer_id, identity_type);

CREATE TABLE IF NOT EXISTS xtra_memory_episodes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  conversation_id TEXT,
  event_type TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  summary TEXT NOT NULL,
  outcome TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  happened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xtra_memory_episodes_customer_time ON xtra_memory_episodes(customer_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_xtra_memory_episodes_subject ON xtra_memory_episodes(subject_type, subject_id, happened_at DESC);

CREATE TABLE IF NOT EXISTS xtra_memory_facts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  source_episode_id TEXT,
  source_conversation_id TEXT,
  confidence REAL NOT NULL DEFAULT 1.0,
  first_observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_confirmed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (source_episode_id) REFERENCES xtra_memory_episodes(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_xtra_memory_facts_value ON xtra_memory_facts(customer_id, fact_key, fact_value);
CREATE INDEX IF NOT EXISTS idx_xtra_memory_facts_active ON xtra_memory_facts(customer_id, status, fact_key, last_confirmed_at DESC);

CREATE TABLE IF NOT EXISTS xtra_memory_jobs_processed (
  idempotency_key TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS xtra_memory_conversation_links (
  conversation_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xtra_memory_conversation_customer ON xtra_memory_conversation_links(customer_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS xtra_memory_lead_links (
  lead_id INTEGER PRIMARY KEY,
  customer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES xtra_memory_customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xtra_memory_lead_customer ON xtra_memory_lead_links(customer_id, created_at DESC);
