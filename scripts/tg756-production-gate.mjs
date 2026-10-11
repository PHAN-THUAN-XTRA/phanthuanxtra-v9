// Fail-closed production gate for the owner-approved tg-756 Lexus correction.
// Read-only checks: this file NEVER writes to D1, R2, CMS, or GitHub.
export const CAR_ID = "tg-756";
export const MIGRATION = "0038_tg_756_owner_reconcile.sql";
export const OWNER_MILEAGE = 17368;
export const OWNER_PRICE = 6799000000;
// Zero-based positions from the owner's actual 27-tile screenshot.
// The model is original #4 (second row center), and must be the hero.
export const ORIGINAL_INDEX_ORDER = Object.freeze([
  4,0,3,6,2,1,5,9,16,12,7,8,10,11,13,14,15,17,18,19,20,21,22,23,24,25,26
]);

function expect(condition, message) {
  if (!condition) throw new Error("tg-756 FAIL-CLOSED: " + message);
}
function resultRows(value) { return value?.[0]?.results || []; }
const canonical = url => typeof url === "string" &&
  url.startsWith("https://phanthuanxtra.com/media/vehicles/") &&
  !/%2f/i.test(url);
function checkCar(car) {
  expect(car?.id === CAR_ID, "the canonical vehicle row is missing");
  expect(/lexus/i.test(String(car.brand)), "vehicle brand does not match Lexus");
  expect(/lm\s*500h/i.test(String(car.model)), "vehicle model does not match LM500h");
}
function checkGallery(rows) {
  expect(rows.length === 27, "expected exactly 27 existing images, got " + rows.length);
  expect(new Set(rows.map(row => Number(row.id))).size === 27, "duplicate image IDs");
  expect(new Set(rows.map(row => row.url)).size === 27, "duplicate gallery URLs");
  for (let i = 0; i < 27; i++) {
    expect(Number(rows[i].sort_order) === i, "noncontiguous sort_order at index " + i);
    expect(Number.isInteger(Number(rows[i].id)) && Number(rows[i].id) > 0, "invalid image ID " + i);
    expect(canonical(rows[i].url), "noncanonical media URL at index " + i);
  }
}
async function fetchState(queryD1) {
  const carRows = resultRows(await queryD1(
    "SELECT id,brand,model,mileage,price,cover_image FROM cars WHERE id=?", [CAR_ID]
  ));
  const imageRows = resultRows(await queryD1(
    "SELECT id,url,sort_order,is_cover FROM car_images WHERE car_id=? ORDER BY sort_order,id", [CAR_ID]
  ));
  expect(carRows.length === 1, "expected one canonical cars row");
  const car = carRows[0];
  checkCar(car);
  checkGallery(imageRows);
  return { car, imageRows };
}
export async function preflightTg756(queryD1) {
  const markers = resultRows(await queryD1(
    "SELECT name FROM d1_migrations WHERE name=?", [MIGRATION]
  ));
  if (markers.length) return { alreadyApplied: true };
  const {car,imageRows} = await fetchState(queryD1);
  // The model's original gallery position is screenshot tile 5 (index 4).
  expect(imageRows[4].url !== "", "the model-image source slot is missing");
  return { alreadyApplied: false, imageCount: imageRows.length, oldCover: car.cover_image };
}
export async function verifyTg756Production(queryD1) {
  const {car,imageRows} = await fetchState(queryD1);
  expect(Number(car.mileage) === OWNER_MILEAGE, "wrong ODO in D1");
  expect(Number(car.price) === OWNER_PRICE, "wrong price in D1");
  expect(imageRows[0].url === car.cover_image, "the hero is not the first ordered image");
  for(let i=0;i<27;i++) expect(Number(imageRows[i].is_cover) === (i===0?1:0), "not exactly one first-position cover");

  // Match all 27 original IDs/URLs to screenshot-derived order, without
  // relying on Telegram filenames or a guessed photo ID.
  const records = resultRows(await queryD1(
    "SELECT summary FROM cms_audit_log WHERE actor=? AND action='snapshot_before' AND resource_id=? ORDER BY id DESC LIMIT 1",
    ["owner-tg756-20261011",CAR_ID]
  ));
  expect(records.length === 1, "the pre-migration D1 rollback snapshot is missing");
  let snapshot;
  try { snapshot = JSON.parse(records[0].summary); }
  catch { throw new Error("tg-756 FAIL-CLOSED: invalid rollback snapshot JSON"); }
  expect(Array.isArray(snapshot?.images) && snapshot.images.length===27, "incomplete rollback snapshot");
  const old = [...snapshot.images].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  for (let i=0;i<27;i++){
    const src=old[ORIGINAL_INDEX_ORDER[i]], now=imageRows[i];
    expect(Number(src.id)===Number(now.id) && src.url===now.url, "image mapping differs from approved gallery sequence at " + i);
  }
  expect(Number(old[4].id)===Number(imageRows[0].id), "model image is not first");
  return { ok:true, id:CAR_ID, mileage:OWNER_MILEAGE, price:OWNER_PRICE, imageCount:27, coverImageId:Number(imageRows[0].id) };
}
