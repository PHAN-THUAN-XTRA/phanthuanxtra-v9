-- 2026-10-13 owner-approved reversible hide of existing tg-756 and tg-527.
-- Only status/updated_at changes. Retain canonical cars, gallery rows and R2 bytes.
-- Each row is guarded by its known owner-reviewed identity and gallery size.
-- Read-only deployment preflight MUST pass before this migration is applied.
INSERT INTO cms_audit_log(actor,action,resource,resource_id,summary)
SELECT 'owner-hide-tg756-tg527-20261013','visibility','car',id,
       'hidden by owner; previous_status=' || status ||
       '; image_count=' || (SELECT COUNT(*) FROM car_images WHERE car_id=cars.id)
FROM cars
WHERE status <> 'hidden' AND (
    (id='tg-756' AND lower(brand) LIKE '%lexus%' AND
     replace(lower(model),' ','') LIKE '%lm500h%' AND
     (SELECT COUNT(*) FROM car_images WHERE car_id=cars.id)=29)
 OR (id='tg-527' AND lower(brand) LIKE '%lexus%' AND
     (SELECT COUNT(*) FROM car_images WHERE car_id=cars.id)=24)
);
UPDATE cars SET status='hidden',updated_at=CURRENT_TIMESTAMP
WHERE status <> 'hidden' AND (
    (id='tg-756' AND lower(brand) LIKE '%lexus%' AND
     replace(lower(model),' ','') LIKE '%lm500h%' AND
     (SELECT COUNT(*) FROM car_images WHERE car_id=cars.id)=29)
 OR (id='tg-527' AND lower(brand) LIKE '%lexus%' AND
     (SELECT COUNT(*) FROM car_images WHERE car_id=cars.id)=24)
);
