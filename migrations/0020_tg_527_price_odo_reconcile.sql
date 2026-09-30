-- Reconcile owner-approved production values for canonical vehicle tg-527.
UPDATE cars
SET mileage = 12000,
    price = 4580000000,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tg-527';

-- Abort the migration unless the canonical row exists with the exact approved values.
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM cars
    WHERE id = 'tg-527'
      AND mileage = 12000
      AND price = 4580000000
  ) THEN 1
  ELSE RAISE(ABORT, 'tg-527 price/ODO production reconciliation failed')
END;
