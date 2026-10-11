-- PHAN THUAN XTRA: 2026-10-11 owner-approved tg-756 correction.
-- Read MASTER_PROJECT_STATUS.md: human/model image must be the FIRST hero
-- and gallery tile. In the owner's 27-photo screenshot the model is at old
-- sort_order=4 (second row, middle column). This is the canonical cover.
-- No DELETE, no image row replacement and no R2 writes. Single existing ID.
-- Deployment controller runs fail-closed read-only source preflight BEFORE
-- applying this one-time migration, and verifies D1/public values afterwards.
--
-- Capture all pre-change values and full image metadata for manual rollback.
INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
SELECT 'owner-tg756-20261011','snapshot_before','car',id,
       json_object(
         'mileage',mileage,'price',price,'description',description,
         'cover_image',cover_image,
         'images',(SELECT json_group_array(json_object(
                    'id',id,'url',url,'sort_order',sort_order,'is_cover',is_cover))
                   FROM (SELECT id,url,sort_order,is_cover FROM car_images
                         WHERE car_id='tg-756' ORDER BY sort_order,id))
       )
FROM cars WHERE id='tg-756' AND (SELECT COUNT(*) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT id) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT url) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT sort_order) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT MIN(sort_order) FROM car_images WHERE car_id='tg-756')=0
 AND (SELECT MAX(sort_order) FROM car_images WHERE car_id='tg-756')=26
 AND NOT EXISTS (
   SELECT 1 FROM car_images
   WHERE car_id='tg-756'
     AND (url NOT LIKE 'https://phanthuanxtra.com/media/vehicles/%'
          OR instr(upper(url),'%2F')>0)
 );

-- Deliberate semantic grouping: model first, exterior, cockpit, interior.
-- CASE reads ORIGINAL sort_order values in SQLite's single UPDATE statement.
UPDATE car_images
SET sort_order = CASE sort_order
    WHEN 4 THEN 0
    WHEN 0 THEN 1
    WHEN 3 THEN 2
    WHEN 6 THEN 3
    WHEN 2 THEN 4
    WHEN 1 THEN 5
    WHEN 5 THEN 6
    WHEN 9 THEN 7
    WHEN 16 THEN 8
    WHEN 12 THEN 9
    WHEN 7 THEN 10
    WHEN 8 THEN 11
    WHEN 10 THEN 12
    WHEN 11 THEN 13
    WHEN 13 THEN 14
    WHEN 14 THEN 15
    WHEN 15 THEN 16
    WHEN 17 THEN 17
    WHEN 18 THEN 18
    WHEN 19 THEN 19
    WHEN 20 THEN 20
    WHEN 21 THEN 21
    WHEN 22 THEN 22
    WHEN 23 THEN 23
    WHEN 24 THEN 24
    WHEN 25 THEN 25
    WHEN 26 THEN 26
    ELSE sort_order
  END,
  is_cover = CASE WHEN sort_order=4 THEN 1 ELSE 0 END
WHERE car_id='tg-756' AND (SELECT COUNT(*) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT id) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT url) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT sort_order) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT MIN(sort_order) FROM car_images WHERE car_id='tg-756')=0
 AND (SELECT MAX(sort_order) FROM car_images WHERE car_id='tg-756')=26
 AND NOT EXISTS (
   SELECT 1 FROM car_images
   WHERE car_id='tg-756'
     AND (url NOT LIKE 'https://phanthuanxtra.com/media/vehicles/%'
          OR instr(upper(url),'%2F')>0)
 );

UPDATE cars
SET mileage=17368,
    price=6799000000,
    cover_image=(SELECT url FROM car_images
                 WHERE car_id='tg-756' AND sort_order=0 AND is_cover=1 LIMIT 1),
    updated_at=CURRENT_TIMESTAMP
WHERE id='tg-756'
  AND (SELECT COUNT(*) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT id) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT url) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT sort_order) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT MIN(sort_order) FROM car_images WHERE car_id='tg-756')=0
 AND (SELECT MAX(sort_order) FROM car_images WHERE car_id='tg-756')=26
 AND NOT EXISTS (
   SELECT 1 FROM car_images
   WHERE car_id='tg-756'
     AND (url NOT LIKE 'https://phanthuanxtra.com/media/vehicles/%'
          OR instr(upper(url),'%2F')>0)
 );

INSERT INTO cms_audit_log (actor,action,resource,resource_id,summary)
SELECT 'owner-tg756-20261011','reconcile','car','tg-756',
       'Owner-approved 17368 km; 6799000000 VND; 27 images; model is first image and cover'
WHERE EXISTS (SELECT 1 FROM cars WHERE id='tg-756' AND mileage=17368 AND price=6799000000)
  AND (SELECT COUNT(*) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT id) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT url) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT COUNT(DISTINCT sort_order) FROM car_images WHERE car_id='tg-756')=27
 AND (SELECT MIN(sort_order) FROM car_images WHERE car_id='tg-756')=0
 AND (SELECT MAX(sort_order) FROM car_images WHERE car_id='tg-756')=26
 AND NOT EXISTS (
   SELECT 1 FROM car_images
   WHERE car_id='tg-756'
     AND (url NOT LIKE 'https://phanthuanxtra.com/media/vehicles/%'
          OR instr(upper(url),'%2F')>0)
 );
