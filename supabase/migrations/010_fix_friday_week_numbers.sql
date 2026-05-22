-- Fix week numbers for logs submitted on Fridays (IST) from May 2026 onwards.
-- Old formula used May 1 (Friday) as start, making Fridays count as day 0 of a new week.
-- New formula uses May 2 (Saturday) as start, so Fridays are the last day of a week.
-- Affected rows: Fridays that were assigned week_number one too high.

UPDATE weekly_logs
SET week_number = week_number - 1
WHERE week_number > 1
  AND submitted_at >= '2026-05-01T00:00:00+00:00'
  AND EXTRACT(DOW FROM (submitted_at AT TIME ZONE 'Asia/Kolkata')) = 5;
