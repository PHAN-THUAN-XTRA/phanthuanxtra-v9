CREATE TABLE IF NOT EXISTS seo_metadata (
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(resource_type,resource_id)
);
CREATE INDEX IF NOT EXISTS idx_seo_metadata_updated_at ON seo_metadata(updated_at);
