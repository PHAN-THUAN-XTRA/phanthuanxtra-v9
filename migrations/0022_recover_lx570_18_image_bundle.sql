-- Recover the current Lexus LX570 intake safely across Telegram webhook ordering.
-- Telegram may deliver /carnew, two albums and the article in a different order.
-- Select the latest pending LX570 article, then take the 18 nearest pending photos
-- in the same chat (before OR after the article), preserving their original id order.
WITH target AS (
  SELECT id, chat_id
  FROM telegram_inbox
  WHERE file_id = ''
    AND bundle_status = 'pending'
    AND UPPER(caption) LIKE '%LEXUS%LX570%'
  ORDER BY id DESC LIMIT 1
),
photos AS (
  SELECT p.id
  FROM telegram_inbox p JOIN target t ON p.chat_id=t.chat_id
  WHERE p.file_id <> '' AND p.bundle_status='pending'
  ORDER BY ABS(p.id-t.id), p.id
  LIMIT 18
),
members AS (
  SELECT id FROM photos
  UNION ALL SELECT id FROM target
)
UPDATE telegram_inbox
SET bundle_key=(SELECT 'recover:lx570:'||chat_id||':'||id FROM target),
    bundle_status='queued',
    updated_at=CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM members)
  AND (SELECT COUNT(*) FROM photos)=18;
