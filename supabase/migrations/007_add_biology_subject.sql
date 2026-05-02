-- Add Biology to subject CHECK constraints across all tables

ALTER TABLE lecture_plans
  DROP CONSTRAINT IF EXISTS lecture_plans_subject_check;
ALTER TABLE lecture_plans
  ADD CONSTRAINT lecture_plans_subject_check
  CHECK (subject IN ('Physics', 'Chemistry', 'Botany', 'Zoology', 'Mathematics', 'Biology'));

ALTER TABLE teacher_batch_assignments
  DROP CONSTRAINT IF EXISTS teacher_batch_assignments_subject_check;
ALTER TABLE teacher_batch_assignments
  ADD CONSTRAINT teacher_batch_assignments_subject_check
  CHECK (subject IN ('Physics', 'Chemistry', 'Botany', 'Zoology', 'Mathematics', 'Biology'));

ALTER TABLE weekly_logs
  DROP CONSTRAINT IF EXISTS weekly_logs_subject_check;
ALTER TABLE weekly_logs
  ADD CONSTRAINT weekly_logs_subject_check
  CHECK (subject IN ('Physics', 'Chemistry', 'Botany', 'Zoology', 'Mathematics', 'Biology'));
