-- Owner-approved correction for the existing Lexus tg-527 listing.
-- Idempotent: update the canonical published record; never republish the vehicle.
UPDATE cars
SET mileage = 12000,
    price = 4580000000,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tg-527';
