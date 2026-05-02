-- Widen class_level CHECK on lecture_plans to support 8th–12th grades (SSC/CBSE)
ALTER TABLE lecture_plans
  DROP CONSTRAINT IF EXISTS lecture_plans_class_level_check;

ALTER TABLE lecture_plans
  ADD CONSTRAINT lecture_plans_class_level_check
  CHECK (class_level IN ('8', '9', '10', '11', '12'));

-- Widen class_level CHECK on batches as well
ALTER TABLE batches
  DROP CONSTRAINT IF EXISTS batches_class_level_check;

ALTER TABLE batches
  ADD CONSTRAINT batches_class_level_check
  CHECK (class_level IN ('8', '9', '10', '11', '12'));
