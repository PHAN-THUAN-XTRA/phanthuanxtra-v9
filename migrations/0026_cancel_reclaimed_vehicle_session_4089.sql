-- Cancel the accidentally reclaimed vehicle session opened by /carnew message 4089.
-- Preserve all media and published records; only detach still-pending rows from this session.
UPDATE telegram_inbox
SET bundle_key = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE chat_id = '6451516147'
  AND bundle_status = 'pending'
  AND bundle_key = '6451516147:vehicle-session:4089';

UPDATE telegram_vehicle_sessions
SET status = 'closed',
    updated_at = CURRENT_TIMESTAMP
WHERE chat_id = '6451516147'
  AND session_key = '6451516147:vehicle-session:4089'
  AND status = 'open';
