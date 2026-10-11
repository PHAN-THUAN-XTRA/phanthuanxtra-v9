-- Owner-approved Lexus LM500h tg-756 production reconciliation (2026-10-11).
-- Semantic sequence comes from the owner's 27-tile screenshot, indexed 0..26.
-- Preserve all 27 existing D1 image IDs, URLs and R2 objects; do not republish.
-- If the source gallery has changed, do not mutate it: deployment verification fails.
--
-- Save previous fields and the complete gallery ID/URL/order/cover mapping for rollback.
INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
SELECT 'owner-reconcile-20261011','snapshot_before','car',id,
       json_object(
         'mileage',mileage,'price',price,'cover_image',cover_image,
         'images',(
           SELECT json_group_array(json_object('id',id,'url',url,'sort_order',sort_order,'is_cover',is_cover))
           FROM (SELECT id,url,sort_order,is_cover FROM car_images
                 WHERE car_id='tg-756' ORDER BY sort_order,id)
         )
       )
FROM cars WHERE id='tg-756';

-- All 27 original positions must still exist exactly once, with canonical media URLs.
-- Keep the original position 0 (front three-quarter exterior) as the cover/hero.
-- Exterior 0,3,6,2,1,5,9; cabin and features; owner portrait at the end.
UPDATE car_images
SET sort_order = CASE sort_order
    WHEN 0 THEN 0
    WHEN 3 THEN 1
    WHEN 6 THEN 2
    WHEN 2 THEN 3
    WHEN 1 THEN 4
    WHEN 5 THEN 5
    WHEN 9 THEN 6
    WHEN 7 THEN 7
    WHEN 8 THEN 8
    WHEN 14 THEN 9
    WHEN 16 THEN 10
    WHEN 10 THEN 11
    WHEN 11 THEN 12
    WHEN 12 THEN 13
    WHEN 13 THEN 14
    WHEN 15 THEN 15
    WHEN 17 THEN 16
    WHEN 18 THEN 17
    WHEN 19 THEN 18
    WHEN 20 THEN 19
    WHEN 21 THEN 20
    WHEN 22 THEN 21
    WHEN 23 THEN 22
    WHEN 24 THEN 23
    WHEN 25 THEN 24
    WHEN 26 THEN 25
    WHEN 4 THEN 26
    ELSE sort_order
  END,
  is_cover = CASE WHEN sort_order=0 THEN 1 ELSE 0 END
WHERE car_id='tg-756' AND (SELECT COUNT(*) FROM car_images WHERE car_id='tg-756') = 27
  AND (SELECT COUNT(DISTINCT sort_order) FROM car_images WHERE car_id='tg-756') = 27
  AND (SELECT MIN(sort_order) FROM car_images WHERE car_id='tg-756') = 0
  AND (SELECT MAX(sort_order) FROM car_images WHERE car_id='tg-756') = 26
  AND NOT EXISTS (
    SELECT 1 FROM car_images
    WHERE car_id='tg-756'
      AND (url NOT LIKE 'https://phanthuanxtra.com/media/vehicles/%' OR url LIKE '%\%2F%')
  );

-- Owner-approved exact numeric values. Update together with canonical hero URL
-- only when the complete gallery precondition passed. No image replacement.
UPDATE cars
SET mileage=17368,
    price=6799000000,
    cover_image=(SELECT url FROM car_images
                 WHERE car_id='tg-756' AND sort_order=0 LIMIT 1),
    updated_at=CURRENT_TIMESTAMP
WHERE id='tg-756'
  AND (SELECT COUNT(*) FROM car_images WHERE car_id='tg-756') = 27
  AND (SELECT COUNT(DISTINCT sort_order) FROM car_images WHERE car_id='tg-756') = 27
  AND (SELECT MIN(sort_order) FROM car_images WHERE car_id='tg-756') = 0
  AND (SELECT MAX(sort_order) FROM car_images WHERE car_id='tg-756') = 26
  AND NOT EXISTS (
    SELECT 1 FROM car_images
    WHERE car_id='tg-756'
      AND (url NOT LIKE 'https://phanthuanxtra.com/media/vehicles/%' OR url LIKE '%\%2F%')
  );

INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
SELECT 'owner-reconcile-20261011','reconcile','car','tg-756',
       'owner mileage=17368; price=6799000000; gallery=27; cover=exterior position 0; no R2/D1 image deletion'
WHERE EXISTS (SELECT 1 FROM cars WHERE id='tg-756' AND mileage=17368 AND price=6799000000)
  AND (SELECT COUNT(*) FROM car_images WHERE car_id='tg-756') = 27
  AND (SELECT COUNT(DISTINCT sort_order) FROM car_images WHERE car_id='tg-756') = 27
  AND (SELECT MIN(sort_order) FROM car_images WHERE car_id='tg-756') = 0
  AND (SELECT MAX(sort_order) FROM car_images WHERE car_id='tg-756') = 26
  AND NOT EXISTS (
    SELECT 1 FROM car_images
    WHERE car_id='tg-756'
      AND (url NOT LIKE 'https://phanthuanxtra.com/media/vehicles/%' OR url LIKE '%\%2F%')
  );
