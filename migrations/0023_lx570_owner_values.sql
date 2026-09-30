-- Lock owner-approved Lexus LX570 values into the recovered Inbox 444 draft.
-- Do not publish here; /carpreview 444 remains mandatory before /carpublish 444.
UPDATE vehicle_ai_drafts
SET ai_json = json_set(
      ai_json,
      '$.mileage', 54800,
      '$.price', 4579000000,
      '$._owner_values_locked', 1,
      '$._owner_values_source', 'owner_approved'
    ),
    status = 'awaiting_review',
    updated_at = CURRENT_TIMESTAMP
WHERE inbox_id = 444
  AND status IN ('awaiting_review','previewed')
  AND CAST(json_extract(ai_json,'$.image_count') AS INTEGER) = 18;
