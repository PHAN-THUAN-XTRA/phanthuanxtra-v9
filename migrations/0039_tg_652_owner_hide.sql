-- Owner request 2026-10-11: hide the already-published Audi Q7 tg-652 again.
-- Safe, reversible, idempotent D1 UPDATE. Do not delete any car/image/R2 data.
-- Preserve previous status in the canonical CMS audit log for a future restoration.
INSERT INTO cms_audit_log(actor,action,resource,resource_id,summary)
SELECT 'owner-tg652-20261011','visibility','car','tg-652',
       'hidden by owner; previous_status=' || status ||
       '; image_count=' || (SELECT COUNT(*) FROM car_images WHERE car_id='tg-652')
FROM cars WHERE id='tg-652' AND status <> 'hidden'
AND EXISTS (SELECT 1 FROM car_images WHERE car_id='tg-652');

UPDATE cars
SET status='hidden',updated_at=CURRENT_TIMESTAMP
WHERE id='tg-652' AND status <> 'hidden'
AND EXISTS (SELECT 1 FROM car_images WHERE car_id='tg-652');
