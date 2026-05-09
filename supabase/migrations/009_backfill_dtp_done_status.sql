-- Backfill: mark question_uploads as dtp_done where fair copy files already exist
UPDATE question_uploads
SET status = 'dtp_done'
WHERE status = 'uploaded'
  AND id IN (
    SELECT DISTINCT upload_id
    FROM question_files
    WHERE is_fair_copy = true
  );
