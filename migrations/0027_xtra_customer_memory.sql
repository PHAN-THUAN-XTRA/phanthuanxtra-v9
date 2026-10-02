-- XTRA Memory Brain v1
-- Customer Identity + Episodic Memory + Semantic Facts + durable job idempotency.

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_last_seen ON customers(last_seen_at DESC);

CREATE TABLE IF NOT EXISTS customer_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  identity_type TEXT NOT NULL,
  identity_value TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(identity_type, identity_value),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_identities_customer ON customer_identities(customer_id, identity_type);

CREATE TABLE IF NOT EXISTS customer_episodes (
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
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_episodes_customer_time ON customer_episodes(customer_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_episodes_subject ON customer_episodes(subject_type, subject_id, happened_at DESC);

CREATE TABLE IF NOT EXISTS customer_facts (
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
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (source_episode_id) REFERENCES customer_episodes(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_facts_value ON customer_facts(customer_id, fact_key, fact_value);
CREATE INDEX IF NOT EXISTS idx_customer_facts_active ON customer_facts(customer_id, status, fact_key, last_confirmed_at DESC);

CREATE TABLE IF NOT EXISTS memory_jobs_processed (
  idempotency_key TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

ALTER TABLE ai_conversations ADD COLUMN customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_customer ON ai_conversations(customer_id, updated_at DESC);

ALTER TABLE leads ADD COLUMN customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customer_id, created_at DESC);
