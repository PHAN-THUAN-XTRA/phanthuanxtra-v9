-- Owner review records readiness only. Neither table is a publishing queue.
CREATE TABLE IF NOT EXISTS xtra_content_owner_operations (
  operation_key TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  target_key TEXT NOT NULL REFERENCES xtra_content_prep_requests(request_key),
  action TEXT NOT NULL CHECK(action IN ('edit','accepted','dismissed')),
  fingerprint TEXT NOT NULL,
  actor TEXT NOT NULL,
  result_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'claimed' CHECK(status IN ('claimed','completed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS xtra_content_owner_reviews (
  review_key TEXT PRIMARY KEY,
  request_key TEXT NOT NULL REFERENCES xtra_content_prep_requests(request_key),
  operation_key TEXT NOT NULL UNIQUE REFERENCES xtra_content_owner_operations(operation_key),
  draft_revision TEXT NOT NULL,
  proposed_at TEXT,
  decision TEXT NOT NULL CHECK(decision IN ('accepted','dismissed')),
  actor TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_owner_reviews_request ON xtra_content_owner_reviews(request_key,decided_at);
