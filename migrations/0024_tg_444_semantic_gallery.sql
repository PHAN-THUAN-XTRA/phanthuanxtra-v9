-- Repair tg-444 from the original two Telegram albums.
-- The bad recovery included unrelated row 444 and omitted exactly one adjacent album row.
-- Fail closed: only repair when D1 exposes exactly one valid adjacent candidate (551 or 569).
CREATE TEMP TABLE _tg444_missing AS
SELECT id, processed_image_url
FROM telegram_inbox
WHERE id IN (551,569)
  AND file_id <> ''
  AND processed_image_url <> ''
  AND processed_image_url LIKE '/media/vehicles/%.webp';

-- Deliberately violate UNIQUE if candidate count is not exactly one.
CREATE TEMP TABLE _tg444_guard (k INTEGER PRIMARY KEY);
INSERT INTO _tg444_guard(k) VALUES (1);
INSERT INTO _tg444_guard(k)
SELECT 1 WHERE (SELECT COUNT(*) FROM _tg444_missing) <> 1;

DELETE FROM car_images
WHERE car_id='tg-444'
  AND url='https://phanthuanxtra.com/media/vehicles/telegram-444-3b7aec5feb857597.webp';

INSERT INTO car_images(car_id,url,sort_order,is_cover)
SELECT 'tg-444',
       'https://phanthuanxtra.com/media/' || REPLACE(processed_image_url,'/media/',''),
       17,0
FROM _tg444_missing
WHERE NOT EXISTS (
  SELECT 1 FROM car_images
  WHERE car_id='tg-444'
    AND url='https://phanthuanxtra.com/media/' || REPLACE(_tg444_missing.processed_image_url,'/media/','')
);

-- Semantic order for the 17 visible verified LX570 images.
WITH ordered(url, sort_order) AS (
  VALUES
    ('https://phanthuanxtra.com/media/vehicles/telegram-555-004107aea58e4ebd.webp',0),
    ('https://phanthuanxtra.com/media/vehicles/telegram-554-23dcb8401e56d467.webp',1),
    ('https://phanthuanxtra.com/media/vehicles/telegram-556-1bcf83a89a0e4509.webp',2),
    ('https://phanthuanxtra.com/media/vehicles/telegram-552-e4543cf92c5ce295.webp',3),
    ('https://phanthuanxtra.com/media/vehicles/telegram-553-811a0623d87fdf2b.webp',4),
    ('https://phanthuanxtra.com/media/vehicles/telegram-560-561e2f4e19f778cd.webp',5),
    ('https://phanthuanxtra.com/media/vehicles/telegram-557-e4152ca6d1b544ad.webp',6),
    ('https://phanthuanxtra.com/media/vehicles/telegram-567-f09a75951cadcb1d.webp',7),
    ('https://phanthuanxtra.com/media/vehicles/telegram-558-3a8dd58bb844c11c.webp',8),
    ('https://phanthuanxtra.com/media/vehicles/telegram-559-8f5b60263921aa5e.webp',9),
    ('https://phanthuanxtra.com/media/vehicles/telegram-562-581bed3ff54367f5.webp',10),
    ('https://phanthuanxtra.com/media/vehicles/telegram-565-741abb2d25ec9acf.webp',11),
    ('https://phanthuanxtra.com/media/vehicles/telegram-564-19d7259b250d8e72.webp',12),
    ('https://phanthuanxtra.com/media/vehicles/telegram-566-17d078c944b9ada4.webp',13),
    ('https://phanthuanxtra.com/media/vehicles/telegram-568-d2ec80f112be62df.webp',14),
    ('https://phanthuanxtra.com/media/vehicles/telegram-561-16da962ac4cdccaa.webp',15),
    ('https://phanthuanxtra.com/media/vehicles/telegram-563-e6b66162e499bd47.webp',16)
)
UPDATE car_images
SET sort_order=(SELECT ordered.sort_order FROM ordered WHERE ordered.url=car_images.url)
WHERE car_id='tg-444' AND url IN (SELECT url FROM ordered);

UPDATE car_images SET is_cover=CASE WHEN sort_order=0 THEN 1 ELSE 0 END WHERE car_id='tg-444';
UPDATE cars
SET cover_image='https://phanthuanxtra.com/media/vehicles/telegram-555-004107aea58e4ebd.webp',
    updated_at=CURRENT_TIMESTAMP
WHERE id='tg-444';

DROP TABLE _tg444_missing;
DROP TABLE _tg444_guard;
