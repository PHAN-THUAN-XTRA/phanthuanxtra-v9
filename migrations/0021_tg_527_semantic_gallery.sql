-- Owner-reviewed semantic gallery reconciliation for canonical vehicle tg-527.
-- Source visual review: 24 approved images. Update in place; never republish.
-- Semantic order: human/cockpit -> exterior front-to-rear -> technical -> cockpit/interior -> cargo.
UPDATE car_images
SET
  url = REPLACE(url, '/media/vehicles%2F', '/media/vehicles/'),
  sort_order = CASE id
    WHEN 1228 THEN 0
    WHEN 1244 THEN 1
    WHEN 1224 THEN 2
    WHEN 1226 THEN 3
    WHEN 1227 THEN 4
    WHEN 1225 THEN 5
    WHEN 1229 THEN 6
    WHEN 1230 THEN 7
    WHEN 1238 THEN 8
    WHEN 1233 THEN 9
    WHEN 1232 THEN 10
    WHEN 1236 THEN 11
    WHEN 1245 THEN 12
    WHEN 1235 THEN 13
    WHEN 1246 THEN 14
    WHEN 1234 THEN 15
    WHEN 1241 THEN 16
    WHEN 1240 THEN 17
    WHEN 1239 THEN 18
    WHEN 1242 THEN 19
    WHEN 1237 THEN 20
    WHEN 1243 THEN 21
    WHEN 1231 THEN 22
    WHEN 1247 THEN 23
    ELSE sort_order
  END,
  is_cover = CASE WHEN id = 1228 THEN 1 ELSE 0 END
WHERE car_id = 'tg-527';

UPDATE cars
SET cover_image = 'https://phanthuanxtra.com/media/vehicles/telegram-531-6fc5b1941350ce0d.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tg-527';
