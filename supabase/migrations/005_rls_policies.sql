-- =====================================================================
-- Migration 005: Row-Level Security Policies
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE centers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_batch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_topics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorships              ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_enquiries      ENABLE ROW LEVEL SECURITY;

-- ── HELPER FUNCTIONS ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_center_id()
RETURNS UUID AS $$
  SELECT center_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_profile_id()
RETURNS UUID AS $$
  SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── PUBLIC READ TABLES (centers, subjects, syllabus, lecture_plans) ──

CREATE POLICY "public_read_centers" ON centers
  FOR SELECT USING (true);

CREATE POLICY "public_read_subjects" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "public_read_syllabus" ON syllabus_topics
  FOR SELECT USING (true);

CREATE POLICY "public_read_lecture_plans" ON lecture_plans
  FOR SELECT USING (true);

CREATE POLICY "public_read_holidays" ON holidays
  FOR SELECT USING (true);

-- ── BATCHES ──────────────────────────────────────────────────────

CREATE POLICY "all_read_batches" ON batches
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "head_director_manage_batches" ON batches
  FOR ALL USING (get_my_role() IN ('academic_head', 'director'));

-- ── USER PROFILES ─────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (user_id = auth.uid());

-- Academic head can read profiles in their center (or all if center_id is null)
CREATE POLICY "head_read_profiles" ON user_profiles
  FOR SELECT USING (
    get_my_role() = 'academic_head'
    AND (
      get_my_center_id() IS NULL
      OR center_id = get_my_center_id()
      OR center_id IS NULL
    )
  );

-- Director can read all profiles
CREATE POLICY "director_read_all_profiles" ON user_profiles
  FOR SELECT USING (get_my_role() = 'director');

-- Head can insert/update profiles (for adding teachers)
CREATE POLICY "head_manage_profiles" ON user_profiles
  FOR ALL USING (get_my_role() IN ('academic_head', 'director'));

-- ── TEACHER-BATCH ASSIGNMENTS ─────────────────────────────────────

-- Teachers can read their own assignments
CREATE POLICY "teacher_own_assignments" ON teacher_batch_assignments
  FOR SELECT USING (teacher_id = get_my_profile_id());

-- Head/director can read and manage all assignments
CREATE POLICY "head_director_assignments" ON teacher_batch_assignments
  FOR ALL USING (get_my_role() IN ('academic_head', 'director'));

-- ── WEEKLY LOGS ───────────────────────────────────────────────────

-- Teachers can only see and insert their own weekly logs
CREATE POLICY "teachers_own_logs" ON weekly_logs
  FOR ALL USING (teacher_id = get_my_profile_id());

-- Academic head can see all logs for their center (or all centers if no center restriction)
CREATE POLICY "head_center_logs" ON weekly_logs
  FOR SELECT USING (
    get_my_role() = 'academic_head'
    AND EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = weekly_logs.batch_id
      AND (
        get_my_center_id() IS NULL
        OR b.center_id = get_my_center_id()
      )
    )
  );

-- Head can update/correct logs
CREATE POLICY "head_update_logs" ON weekly_logs
  FOR UPDATE USING (
    get_my_role() = 'academic_head'
    AND EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = weekly_logs.batch_id
      AND (get_my_center_id() IS NULL OR b.center_id = get_my_center_id())
    )
  );

-- Director can see everything
CREATE POLICY "director_all_logs" ON weekly_logs
  FOR SELECT USING (get_my_role() = 'director');

-- ── MENTORSHIPS ──────────────────────────────────────────────────

CREATE POLICY "all_read_mentorships" ON mentorships
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "head_director_mentorships" ON mentorships
  FOR ALL USING (get_my_role() IN ('academic_head', 'director'));

-- ── ADMISSION ENQUIRIES ────────────────────────────────────────

-- Public can insert (no auth required for enquiry form)
CREATE POLICY "public_insert_enquiries" ON admission_enquiries
  FOR INSERT WITH CHECK (true);

-- Head/Director can read and manage enquiries
CREATE POLICY "head_director_enquiries" ON admission_enquiries
  FOR ALL USING (get_my_role() IN ('academic_head', 'director'));

-- ── HOLIDAYS MANAGEMENT ─────────────────────────────────────────

CREATE POLICY "head_director_manage_holidays" ON holidays
  FOR INSERT WITH CHECK (get_my_role() IN ('academic_head', 'director'));

CREATE POLICY "head_director_update_holidays" ON holidays
  FOR UPDATE USING (get_my_role() IN ('academic_head', 'director'));

CREATE POLICY "head_director_delete_holidays" ON holidays
  FOR DELETE USING (get_my_role() IN ('academic_head', 'director'));
