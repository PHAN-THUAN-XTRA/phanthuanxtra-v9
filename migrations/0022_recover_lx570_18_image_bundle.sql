-- Recover the pending Lexus LX570 intake that arrived as one text post plus two
-- Telegram photo batches. Scope is deliberately narrow: the latest pending LX570
-- text row and the next 18 pending photo rows from the same chat.
UPDATE telegram_inbox
SET bundle_key = (
      SELECT 'recover:lx570:' || t.chat_id || ':' || t.id
      FROM telegram_inbox t
      WHERE t.file_id = ''
        AND t.bundle_status = 'pending'
        AND UPPER(t.caption) LIKE '%LEXUS%LX570%'
      ORDER BY t.id DESC LIMIT 1
    ),
    bundle_status = 'queued',
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT p.id
  FROM telegram_inbox p
  JOIN (
    SELECT id, chat_id
    FROM telegram_inbox
    WHERE file_id = ''
      AND bundle_status = 'pending'
      AND UPPER(caption) LIKE '%LEXUS%LX570%'
    ORDER BY id DESC LIMIT 1
  ) t ON p.chat_id = t.chat_id
  WHERE p.file_id <> ''
    AND p.bundle_status = 'pending'
    AND p.id > t.id
  ORDER BY p.id ASC
  LIMIT 18
)
OR id = (
  SELECT id FROM telegram_inbox
  WHERE file_id = ''
    AND bundle_status = 'pending'
    AND UPPER(caption) LIKE '%LEXUS%LX570%'
  ORDER BY id DESC LIMIT 1
);
