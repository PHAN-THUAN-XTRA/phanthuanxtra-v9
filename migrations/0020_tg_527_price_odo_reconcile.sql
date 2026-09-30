-- Reconcile owner-approved production values for canonical vehicle tg-527.
-- Idempotent; production verification is performed by the deploy controller.
UPDATE cars
SET mileage = 12000,
    price = 4580000000,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tg-527';
