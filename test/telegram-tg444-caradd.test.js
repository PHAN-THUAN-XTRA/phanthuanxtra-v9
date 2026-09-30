import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("/caradd 444 is a one-image fail-closed supplement for canonical tg-444", async () => {
  const source=await readFile(new URL("../src/telegram-router.js",import.meta.url),"utf8");
  assert.match(source,/\/caradd\\s\+444/);
  assert.match(source,/vehicle-add:444/);
  assert.match(source,/mileage\)!==54800/);
  assert.match(source,/price\)!==4579000000/);
  assert.match(source,/_owner_values_locked\)!==1/);
  assert.match(source,/gallery\.length!==17/);
  assert.match(source,/telegram-444-3b7aec5feb857597\.webp/);
  assert.match(source,/INSERT INTO car_images\(car_id,url,sort_order,is_cover\) VALUES \('tg-444'/);
  assert.match(source,/const insertAt=5/);
  assert.match(source,/UPDATE telegram_vehicle_sessions SET status='closed'/);
  assert.match(source,/DELETE FROM telegram_vehicle_session_media WHERE session_key=\?/);
  assert.doesNotMatch(source,/\/caradd\s\+\(\\d\+\)/);
});
