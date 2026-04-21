-- =====================================================================
-- UNACADEMY NASHIK — ACADEMIC MANAGEMENT SYSTEM
-- Migration 001: Initial Schema
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── CENTERS ──────────────────────────────────────────────────────────
CREATE TABLE centers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  city        TEXT NOT NULL DEFAULT 'Nashik',
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BATCHES ──────────────────────────────────────────────────────────
CREATE TABLE batches (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  center_id      UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  class_level    TEXT NOT NULL CHECK (class_level IN ('11', '12')),
  batch_type     TEXT NOT NULL CHECK (batch_type IN ('NEET_EXCEL', 'NEET_GROWTH', 'JEE_EXCEL', 'JEE_GROWTH', 'MHT_CET')),
  academic_year  TEXT NOT NULL DEFAULT '2026-27',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, center_id)
);

-- ── USER PROFILES (extends Supabase auth.users) ───────────────────
CREATE TABLE user_profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('teacher', 'academic_head', 'director', 'student')),
  center_id    UUID REFERENCES centers(id),
  employee_id  TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TEACHER-BATCH ASSIGNMENTS ─────────────────────────────────────
CREATE TABLE teacher_batch_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  batch_id    UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Botany', 'Zoology', 'Mathematics')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, batch_id, subject)
);

-- ── SUBJECTS MASTER ───────────────────────────────────────────────
CREATE TABLE subjects (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL UNIQUE,
  batch_types_applicable TEXT[] NOT NULL
);

-- ── SYLLABUS TOPICS ──────────────────────────────────────────────
CREATE TABLE syllabus_topics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_level     TEXT NOT NULL CHECK (class_level IN ('11', '12')),
  chapter_name    TEXT NOT NULL,
  subtopic_name   TEXT,
  chapter_order   INT NOT NULL DEFAULT 0,
  subtopic_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_syllabus_subject_class ON syllabus_topics(subject_id, class_level);
CREATE INDEX idx_syllabus_chapter ON syllabus_topics(chapter_name);

-- ── LECTURE PLANS ────────────────────────────────────────────────
CREATE TABLE lecture_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_type       TEXT NOT NULL,
  subject          TEXT NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Botany', 'Zoology', 'Mathematics')),
  class_level      TEXT NOT NULL CHECK (class_level IN ('11', '12')),
  month_name       TEXT NOT NULL CHECK (month_name IN ('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec')),
  topic_name       TEXT NOT NULL,
  planned_lectures INT NOT NULL DEFAULT 0,
  start_date       TEXT,
  academic_year    TEXT NOT NULL DEFAULT '2026-27',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lp_batch_subject ON lecture_plans(batch_type, subject, class_level, month_name);

-- ── WEEKLY LOGS ───────────────────────────────────────────────────
CREATE TABLE weekly_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  batch_id          UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject           TEXT NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Botany', 'Zoology', 'Mathematics')),
  chapter_name      TEXT NOT NULL,
  subtopics_covered TEXT,
  lectures_this_week INT NOT NULL DEFAULT 0,
  week_number       INT NOT NULL,
  academic_year     TEXT NOT NULL DEFAULT '2026-27',
  notes             TEXT,
  is_holiday        BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wl_teacher ON weekly_logs(teacher_id);
CREATE INDEX idx_wl_batch ON weekly_logs(batch_id);
CREATE INDEX idx_wl_week ON weekly_logs(week_number, academic_year);
CREATE INDEX idx_wl_batch_subject ON weekly_logs(batch_id, subject, academic_year);

-- ── MENTORSHIPS ──────────────────────────────────────────────────
CREATE TABLE mentorships (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  batch_id          UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(mentor_teacher_id, batch_id)
);

-- ── HOLIDAYS ─────────────────────────────────────────────────────
CREATE TABLE holidays (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id           UUID REFERENCES centers(id),
  holiday_date        DATE NOT NULL,
  holiday_name        TEXT NOT NULL,
  affects_all_centers BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ADMISSION ENQUIRIES (foundation for future) ───────────────────
CREATE TABLE admission_enquiries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name     TEXT NOT NULL,
  parent_name      TEXT,
  phone            TEXT NOT NULL,
  email            TEXT,
  class_level      TEXT CHECK (class_level IN ('11', '12')),
  target_exam      TEXT CHECK (target_exam IN ('NEET', 'JEE', 'MHT_CET')),
  center_preference TEXT,
  status           TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'called', 'visited', 'enrolled', 'rejected')),
  notes            TEXT,
  follow_up_date   DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER weekly_logs_updated_at
  BEFORE UPDATE ON weekly_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER admission_enquiries_updated_at
  BEFORE UPDATE ON admission_enquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
