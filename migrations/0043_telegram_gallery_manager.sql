ALTER TABLE vehicle_ai_drafts ADD COLUMN gallery_order_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE vehicle_ai_drafts ADD COLUMN gallery_revision INTEGER NOT NULL DEFAULT 0;

