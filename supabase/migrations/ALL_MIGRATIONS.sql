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
-- =====================================================================
-- Migration 002: Seed Centers, Batches, Subjects
-- =====================================================================

-- ── CENTERS ──────────────────────────────────────────────────────────
INSERT INTO centers (id, name, city, address) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'College Road', 'Nashik', 'College Road, Nashik, Maharashtra'),
  ('a1000000-0000-0000-0000-000000000002', 'Nashik Road', 'Nashik', 'Nashik Road, Nashik, Maharashtra');

-- ── SUBJECTS ─────────────────────────────────────────────────────────
INSERT INTO subjects (id, name, batch_types_applicable) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Physics',     ARRAY['NEET_EXCEL','NEET_GROWTH','JEE_EXCEL','JEE_GROWTH','MHT_CET']),
  ('b1000000-0000-0000-0000-000000000002', 'Chemistry',   ARRAY['NEET_EXCEL','NEET_GROWTH','JEE_EXCEL','JEE_GROWTH','MHT_CET']),
  ('b1000000-0000-0000-0000-000000000003', 'Botany',      ARRAY['NEET_EXCEL','NEET_GROWTH']),
  ('b1000000-0000-0000-0000-000000000004', 'Zoology',     ARRAY['NEET_EXCEL','NEET_GROWTH']),
  ('b1000000-0000-0000-0000-000000000005', 'Mathematics', ARRAY['JEE_EXCEL','JEE_GROWTH','MHT_CET']);

-- ── BATCHES — COLLEGE ROAD ────────────────────────────────────────
INSERT INTO batches (id, name, center_id, class_level, batch_type, academic_year) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'NEET Excel – 1',  'a1000000-0000-0000-0000-000000000001', '12', 'NEET_EXCEL',  '2026-27'),
  ('c1000000-0000-0000-0000-000000000002', 'NEET Excel – 2',  'a1000000-0000-0000-0000-000000000001', '12', 'NEET_EXCEL',  '2026-27'),
  ('c1000000-0000-0000-0000-000000000003', 'JEE Excel – 1',   'a1000000-0000-0000-0000-000000000001', '12', 'JEE_EXCEL',   '2026-27'),
  ('c1000000-0000-0000-0000-000000000004', 'JEE Excel – 2/3', 'a1000000-0000-0000-0000-000000000001', '12', 'JEE_EXCEL',   '2026-27'),
  ('c1000000-0000-0000-0000-000000000005', 'NEET Growth – 1', 'a1000000-0000-0000-0000-000000000001', '11', 'NEET_GROWTH', '2026-27'),
  ('c1000000-0000-0000-0000-000000000006', 'JEE Growth – 1',  'a1000000-0000-0000-0000-000000000001', '11', 'JEE_GROWTH',  '2026-27');

-- ── BATCHES — NASHIK ROAD ─────────────────────────────────────────
INSERT INTO batches (id, name, center_id, class_level, batch_type, academic_year) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'JEE Excel – 1',      'a1000000-0000-0000-0000-000000000002', '12', 'JEE_EXCEL',   '2026-27'),
  ('c2000000-0000-0000-0000-000000000002', 'JEE Excel – 2',      'a1000000-0000-0000-0000-000000000002', '12', 'JEE_EXCEL',   '2026-27'),
  ('c2000000-0000-0000-0000-000000000003', 'JEE Excel – 3',      'a1000000-0000-0000-0000-000000000002', '12', 'JEE_EXCEL',   '2026-27'),
  ('c2000000-0000-0000-0000-000000000004', 'NEET Excel – 1',     'a1000000-0000-0000-0000-000000000002', '12', 'NEET_EXCEL',  '2026-27'),
  ('c2000000-0000-0000-0000-000000000005', 'MHT-CET Excel – 1',  'a1000000-0000-0000-0000-000000000002', '12', 'MHT_CET',     '2026-27'),
  ('c2000000-0000-0000-0000-000000000006', 'NEET Growth – 1',    'a1000000-0000-0000-0000-000000000002', '11', 'NEET_GROWTH', '2026-27');
-- =====================================================================
-- Migration 003: Seed Official Lecture Plans (from Excel + GAS PLAN data)
-- =====================================================================

-- ── JEE EXCEL — Physics (Class 12) ───────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('JEE Excel', 'Physics', '12', 'Feb', '[PHY] Wave',                          10, '23 Feb–10 Mar'),
('JEE Excel', 'Physics', '12', 'Mar', '[PHY] Wave Optics',                    8, '11 Mar–20 Mar'),
('JEE Excel', 'Physics', '12', 'Mar', '[PHY] Modern Physics 1&2',            13, '21 Mar–4 Apr'),
('JEE Excel', 'Physics', '12', 'Apr', '[PHY] Electrostatics',                36, '6 Apr–19 May'),
('JEE Excel', 'Physics', '12', 'May', '[PHY] Capacitance',                   10, '20 May–6 Jun'),
('JEE Excel', 'Physics', '12', 'Jun', '[PHY] Current Electricity',           13, '8 Jun–27 Jun'),
('JEE Excel', 'Physics', '12', 'Jul', '[PHY] Magnetic Effect & Magnetism',   16, '29 Jun–25 Jul'),
('JEE Excel', 'Physics', '12', 'Aug', '[PHY] Electromagnetic Induction',     15, '27 Jul–22 Aug'),
('JEE Excel', 'Physics', '12', 'Sep', '[PHY] Alternating Current',            9, '24 Aug–8 Sep'),
('JEE Excel', 'Physics', '12', 'Sep', '[PHY] Electromagnetic Waves',          2, '9 Sep–12 Sep'),
('JEE Excel', 'Physics', '12', 'Sep', '[PHY] Geometrical Optics',            18, '14 Sep–3 Oct'),
('JEE Excel', 'Physics', '12', 'Oct', '[PHY] Semiconductor',                  4, 'Oct');

-- ── JEE EXCEL — Chemistry (Class 12) ─────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('JEE Excel', 'Chemistry', '12', 'Feb', '[CHE] Optical Isomerism',               6, '11 Mar–17 Mar'),
('JEE Excel', 'Chemistry', '12', 'Mar', '[CHE] Alkyl Halide',                   15, '18 Mar–28 Mar'),
('JEE Excel', 'Chemistry', '12', 'Mar', '[CHE] Alcohols Phenols & Ether',       12, '30 Mar–11 Apr'),
('JEE Excel', 'Chemistry', '12', 'Apr', '[CHE] Carbonyl Compound',              12, '13 Apr–25 Apr'),
('JEE Excel', 'Chemistry', '12', 'Apr', '[CHE] Carboxylic Acid & Derivatives',   4, '26 Apr–30 Apr'),
('JEE Excel', 'Chemistry', '12', 'May', '[CHE] Amines',                          6, '2 May–8 May'),
('JEE Excel', 'Chemistry', '12', 'May', '[CHE] Liquid Solution',                12, '11 May–30 May'),
('JEE Excel', 'Chemistry', '12', 'Jun', '[CHE] Electrochemistry',               19, '1 Jun–27 Jun'),
('JEE Excel', 'Chemistry', '12', 'Jul', '[CHE] Chemical Kinetics',              17, '29 Jun–25 Jul'),
('JEE Excel', 'Chemistry', '12', 'Aug', '[CHE] d & f Block Elements',           10, '27 Jul–11 Aug'),
('JEE Excel', 'Chemistry', '12', 'Aug', '[CHE] Coordination Chemistry',         12, '12 Aug–12 Sep'),
('JEE Excel', 'Chemistry', '12', 'Sep', '[CHE] Biomolecules',                    5, '14 Sep–19 Sep'),
('JEE Excel', 'Chemistry', '12', 'Sep', '[CHE] p-Block Elements',               10, '21 Sep–3 Oct'),
('JEE Excel', 'Chemistry', '12', 'Oct', '[CHE] Salt Analysis',                   3, 'Oct');

-- ── JEE EXCEL — Mathematics (Class 12) ──────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('JEE Excel', 'Mathematics', '12', 'Feb', '[MAT] Relation & Function',                          30, '23 Feb–7 Apr'),
('JEE Excel', 'Mathematics', '12', 'Apr', '[MAT] ITF',                                           6, '8 Apr–14 Apr'),
('JEE Excel', 'Mathematics', '12', 'Apr', '[MAT] Matrices & Determinants',                      18, '15 Apr–7 May'),
('JEE Excel', 'Mathematics', '12', 'May', '[MAT] Limits & Continuity',                          14, '8 May–23 May'),
('JEE Excel', 'Mathematics', '12', 'May', '[MAT] Differentiability & Methods of Differentiation',11, '24 May–6 Jun'),
('JEE Excel', 'Mathematics', '12', 'Jun', '[MAT] Application of Derivatives',                    6, '8 Jun–16 Jun'),
('JEE Excel', 'Mathematics', '12', 'Jun', '[MAT] Indefinite Integral',                          14, '17 Jun–11 Jul'),
('JEE Excel', 'Mathematics', '12', 'Jul', '[MAT] Definite Integral & Area Under the Curve',     12, '13 Jul–1 Aug'),
('JEE Excel', 'Mathematics', '12', 'Aug', '[MAT] Differential Equation',                         5, '3 Aug–10 Aug'),
('JEE Excel', 'Mathematics', '12', 'Aug', '[MAT] Vector & 3D Geometry',                         24, '11 Aug–28 Sep'),
('JEE Excel', 'Mathematics', '12', 'Sep', '[MAT] Probability',                                  10, '29 Sep–3 Oct'),
('JEE Excel', 'Mathematics', '12', 'Sep', '[MAT] Statistics',                                    4, '29 Sep–3 Oct');

-- ── NEET EXCEL — Physics (Class 12) ──────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Excel', 'Physics', '12', 'Feb', '[PHY] Wave',                         10, '16 Feb–28 Feb'),
('NEET Excel', 'Physics', '12', 'Mar', '[PHY] Wave Optics',                   6, '9 Mar–14 Mar'),
('NEET Excel', 'Physics', '12', 'Mar', '[PHY] Modern Physics 1&2',           10, '16 Mar–28 Mar'),
('NEET Excel', 'Physics', '12', 'Mar', '[PHY] Semiconductor',                 5, '30 Mar–4 Apr'),
('NEET Excel', 'Physics', '12', 'Apr', '[PHY] Electrostatics',               10, '6 Apr–18 Apr'),
('NEET Excel', 'Physics', '12', 'May', '[PHY] Capacitance',                  10, 'May'),
('NEET Excel', 'Physics', '12', 'Jun', '[PHY] Current Electricity',          12, 'Jun'),
('NEET Excel', 'Physics', '12', 'Jun', '[PHY] Magnetic Effect & Magnetism',  16, 'Jun–Jul'),
('NEET Excel', 'Physics', '12', 'Jul', '[PHY] Electromagnetic Induction',    10, 'Jul–Aug'),
('NEET Excel', 'Physics', '12', 'Aug', '[PHY] Alternating Current',           9, 'Aug–Sep'),
('NEET Excel', 'Physics', '12', 'Sep', '[PHY] Electromagnetic Waves',         2, 'Sep'),
('NEET Excel', 'Physics', '12', 'Sep', '[PHY] Geometrical Optics',           16, 'Sep–Oct');

-- ── NEET EXCEL — Chemistry (Class 12) ────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Excel', 'Chemistry', '12', 'Mar', '[CHE] Optical Isomerism',               6, 'Mar'),
('NEET Excel', 'Chemistry', '12', 'Mar', '[CHE] Alkyl Halide',                   15, '12 Mar–28 Mar'),
('NEET Excel', 'Chemistry', '12', 'Mar', '[CHE] Alcohols Phenols & Ether',       12, '30 Mar–11 Apr'),
('NEET Excel', 'Chemistry', '12', 'Apr', '[CHE] Carbonyl Compound',              12, '13 Apr–25 Apr'),
('NEET Excel', 'Chemistry', '12', 'Apr', '[CHE] Carboxylic Acid & Derivatives',   4, '27 Apr–30 Apr'),
('NEET Excel', 'Chemistry', '12', 'May', '[CHE] Amines',                          5, '2 May–9 May'),
('NEET Excel', 'Chemistry', '12', 'May', '[CHE] Liquid Solution',                12, '11 May–30 May'),
('NEET Excel', 'Chemistry', '12', 'Jun', '[CHE] Electrochemistry',               16, '1 Jun–27 Jun'),
('NEET Excel', 'Chemistry', '12', 'Jul', '[CHE] Chemical Kinetics',              16, '29 Jun–25 Jul'),
('NEET Excel', 'Chemistry', '12', 'Aug', '[CHE] d & f Block Elements',            8, '27 Jul–8 Aug'),
('NEET Excel', 'Chemistry', '12', 'Aug', '[CHE] Coordination Chemistry',         16, '10 Aug–12 Sep'),
('NEET Excel', 'Chemistry', '12', 'Sep', '[CHE] Biomolecules',                    5, '14 Sep–19 Sep'),
('NEET Excel', 'Chemistry', '12', 'Sep', '[CHE] p-Block Elements',               10, '21 Sep–3 Oct'),
('NEET Excel', 'Chemistry', '12', 'Oct', '[CHE] Salt Analysis',                   3, 'Oct');

-- ── NEET EXCEL — Zoology (Class 12) ──────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Excel', 'Zoology', '12', 'Mar', '[ZOO] Human Health & Disease',               8, '11 Mar–28 Mar'),
('NEET Excel', 'Zoology', '12', 'Mar', '[ZOO] Origin & Evolution',                  16, '30 Mar–30 Apr'),
('NEET Excel', 'Zoology', '12', 'May', '[ZOO] Human Reproduction Part 1',            6, '4 May–23 May'),
('NEET Excel', 'Zoology', '12', 'Jun', '[ZOO] Reproductive Health',                  4, '1 Jun–13 Jun'),
('NEET Excel', 'Zoology', '12', 'Jun', '[ZOO] Biotechnology Principles & Process',  14, '15 Jun–1 Aug'),
('NEET Excel', 'Zoology', '12', 'Aug', '[ZOO] Biotechnology & Application',          5, '3 Aug–15 Aug'),
('NEET Excel', 'Zoology', '12', 'Sep', '[ZOO] Microbes in Human Welfare',            3, '21 Sep–26 Sep');

-- ── NEET EXCEL — Botany (Class 12) ───────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Excel', 'Botany', '12', 'Mar', '[BOT] Organisms & Populations',                       6, '11 Mar–14 Mar'),
('NEET Excel', 'Botany', '12', 'Mar', '[BOT] Ecosystem',                                     5, '16 Mar–28 Mar'),
('NEET Excel', 'Botany', '12', 'Mar', '[BOT] Biodiversity & Conservation',                   4, '30 Mar–4 Apr'),
('NEET Excel', 'Botany', '12', 'Apr', '[BOT] Sexual Reproduction in Flowering Plants',       14, '6 Apr–16 May'),
('NEET Excel', 'Botany', '12', 'May', '[BOT] Principles of Inheritance (Genetics) Part 1',  11, '18 May–20 Jun'),
('NEET Excel', 'Botany', '12', 'Jun', '[BOT] Principles of Inheritance (Genetics) Part 2',  14, '22 Jun–15 Aug'),
('NEET Excel', 'Botany', '12', 'Aug', '[BOT] Molecular Basis of Inheritance',               22, '17 Aug–19 Sep');

-- ── JEE GROWTH — Physics (Class 11) ──────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('JEE Growth', 'Physics', '11', 'May', '[PHY] Units & Dimensions + Error',                           11, 'May'),
('JEE Growth', 'Physics', '11', 'Jun', '[PHY] Kinematics 1D',                                        16, 'Jun'),
('JEE Growth', 'Physics', '11', 'Jul', '[PHY] Kinematics 2D + Newton''s Law & Friction',             16, 'Jul'),
('JEE Growth', 'Physics', '11', 'Aug', '[PHY] Newton''s Law & Friction + Work Power Energy',         16, 'Aug'),
('JEE Growth', 'Physics', '11', 'Sep', '[PHY] Work Power Energy + Circular Motion + Centre of Mass', 16, 'Sep'),
('JEE Growth', 'Physics', '11', 'Oct', '[PHY] Rotational Motion + Gravitation',                      20, 'Oct'),
('JEE Growth', 'Physics', '11', 'Nov', '[PHY] Gravitation + Elasticity + Calorimetry + KTG',         15, 'Nov'),
('JEE Growth', 'Physics', '11', 'Dec', '[PHY] KTG & Thermodynamics + Fluid Mechanics',               24, 'Dec'),
('JEE Growth', 'Physics', '11', 'Jan', '[PHY] Simple Harmonic Motion + Waves',                       19, 'Jan'),
('JEE Growth', 'Physics', '11', 'Feb', '[PHY] Waves',                                                 7, 'Feb');

-- ── JEE GROWTH — Chemistry (Class 11) ────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('JEE Growth', 'Chemistry', '11', 'May', '[CHE] Mole Concept & Concentration Terms',              11, 'May'),
('JEE Growth', 'Chemistry', '11', 'Jun', '[CHE] Mole Concept + Atomic Structure',                 16, 'Jun'),
('JEE Growth', 'Chemistry', '11', 'Jul', '[CHE] Atomic Structure + Periodic Table & Properties', 16, 'Jul'),
('JEE Growth', 'Chemistry', '11', 'Aug', '[CHE] Periodic Table + Chemical Bonding',              16, 'Aug'),
('JEE Growth', 'Chemistry', '11', 'Sep', '[CHE] Chemical Bonding + Thermodynamics 1&2',          16, 'Sep'),
('JEE Growth', 'Chemistry', '11', 'Oct', '[CHE] Thermodynamics + Thermochemistry + Chemical Equilibrium', 20, 'Oct'),
('JEE Growth', 'Chemistry', '11', 'Nov', '[CHE] Chemical Equilibrium + Ionic Equilibrium',       15, 'Nov'),
('JEE Growth', 'Chemistry', '11', 'Dec', '[CHE] Ionic Equilibrium + Redox + Nomenclature',       24, 'Dec'),
('JEE Growth', 'Chemistry', '11', 'Jan', '[CHE] Nomenclature + General Organic Chemistry',       19, 'Jan'),
('JEE Growth', 'Chemistry', '11', 'Feb', '[CHE] Isomerism + Hydrocarbon + p-Block (Gr 13&14)',   14, 'Feb');

-- ── JEE GROWTH — Mathematics (Class 11) ──────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('JEE Growth', 'Mathematics', '11', 'May', '[MAT] Fundamental of Mathematics',                                11, 'May'),
('JEE Growth', 'Mathematics', '11', 'Jun', '[MAT] Fundamental of Maths + Logarithm',                         16, 'Jun'),
('JEE Growth', 'Mathematics', '11', 'Jul', '[MAT] Logarithm + Sequence & Series + Compound Angle',           16, 'Jul'),
('JEE Growth', 'Mathematics', '11', 'Aug', '[MAT] Compound Angle + Trigonometric Equations',                 16, 'Aug'),
('JEE Growth', 'Mathematics', '11', 'Sep', '[MAT] Trigonometric Equations + Quadratic Equation + Straight Line', 16, 'Sep'),
('JEE Growth', 'Mathematics', '11', 'Oct', '[MAT] Straight Line + Circle',                                   20, 'Oct'),
('JEE Growth', 'Mathematics', '11', 'Nov', '[MAT] Circle + Binomial Theorem',                                15, 'Nov'),
('JEE Growth', 'Mathematics', '11', 'Dec', '[MAT] Binomial Theorem + Permutation & Combination + Parabola', 24, 'Dec'),
('JEE Growth', 'Mathematics', '11', 'Jan', '[MAT] Parabola + Ellipse + Hyperbola',                          19, 'Jan'),
('JEE Growth', 'Mathematics', '11', 'Feb', '[MAT] Hyperbola + Complex Numbers',                              15, 'Feb');

-- ── NEET GROWTH — Physics (Class 11) ─────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Growth', 'Physics', '11', 'May', '[PHY] Units & Dimensions + Error',                                      11, 'May'),
('NEET Growth', 'Physics', '11', 'Jun', '[PHY] Kinematics 1D',                                                   16, 'Jun'),
('NEET Growth', 'Physics', '11', 'Jul', '[PHY] Kinematics 2D + Newton''s Law & Friction',                        16, 'Jul'),
('NEET Growth', 'Physics', '11', 'Aug', '[PHY] Newton''s Law & Friction + Work Power Energy',                    16, 'Aug'),
('NEET Growth', 'Physics', '11', 'Sep', '[PHY] Work Power Energy + Circular Motion + Centre of Mass',            16, 'Sep'),
('NEET Growth', 'Physics', '11', 'Oct', '[PHY] COM + Linear Momentum + Rotational Motion',                       20, 'Oct'),
('NEET Growth', 'Physics', '11', 'Nov', '[PHY] Rotational Motion + Gravitation',                                 15, 'Nov'),
('NEET Growth', 'Physics', '11', 'Dec', '[PHY] Mechanical Properties + Thermal Properties + KTG + Fluid',       24, 'Dec'),
('NEET Growth', 'Physics', '11', 'Jan', '[PHY] Mechanical Properties of Fluids + Simple Harmonic Motion',        19, 'Jan'),
('NEET Growth', 'Physics', '11', 'Feb', '[PHY] Waves',                                                           12, 'Feb');

-- ── NEET GROWTH — Chemistry (Class 11) ───────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Growth', 'Chemistry', '11', 'May', '[CHE] Mole Concept & Concentration Terms',                                  11, 'May'),
('NEET Growth', 'Chemistry', '11', 'Jun', '[CHE] Mole Concept + Atomic Structure',                                     16, 'Jun'),
('NEET Growth', 'Chemistry', '11', 'Jul', '[CHE] Atomic Structure + Periodic Table & Properties',                      16, 'Jul'),
('NEET Growth', 'Chemistry', '11', 'Aug', '[CHE] Periodic Table + Chemical Bonding',                                   16, 'Aug'),
('NEET Growth', 'Chemistry', '11', 'Sep', '[CHE] Chemical Bonding + Thermodynamics 1&2',                               16, 'Sep'),
('NEET Growth', 'Chemistry', '11', 'Oct', '[CHE] Thermodynamics + Thermochemistry + Chemical Equilibrium + Ionic Eq', 20, 'Oct'),
('NEET Growth', 'Chemistry', '11', 'Nov', '[CHE] Ionic Equilibrium + Redox',                                           15, 'Nov'),
('NEET Growth', 'Chemistry', '11', 'Dec', '[CHE] Redox + Nomenclature + General Organic Chemistry',                    24, 'Dec'),
('NEET Growth', 'Chemistry', '11', 'Jan', '[CHE] General Organic Chemistry + Isomerism',                               19, 'Jan'),
('NEET Growth', 'Chemistry', '11', 'Feb', '[CHE] Hydrocarbon',                                                         14, 'Feb');

-- ── NEET GROWTH — Zoology (Class 11) ─────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Growth', 'Zoology', '11', 'May', '[ZOO] Animal Kingdom',                                              5, 'May'),
('NEET Growth', 'Zoology', '11', 'Jun', '[ZOO] Animal Kingdom',                                              8, 'Jun'),
('NEET Growth', 'Zoology', '11', 'Jul', '[ZOO] Structural Organisation in Animal',                           8, 'Jul'),
('NEET Growth', 'Zoology', '11', 'Aug', '[ZOO] Structural Organisation + Biomolecules & Enzymes',            8, 'Aug'),
('NEET Growth', 'Zoology', '11', 'Sep', '[ZOO] Biomolecules & Enzymes',                                      8, 'Sep'),
('NEET Growth', 'Zoology', '11', 'Oct', '[ZOO] Breathing & Exchange of Gases + Body Fluids & Circulation',  10, 'Oct'),
('NEET Growth', 'Zoology', '11', 'Nov', '[ZOO] Body Fluids & Circulation',                                   7, 'Nov'),
('NEET Growth', 'Zoology', '11', 'Dec', '[ZOO] Excretory Products + Locomotion & Movement',                 12, 'Dec'),
('NEET Growth', 'Zoology', '11', 'Jan', '[ZOO] Locomotion & Movement + Neural Control & Coordination',      10, 'Jan'),
('NEET Growth', 'Zoology', '11', 'Feb', '[ZOO] Neural Control + Chemical Control & Coordination',            6, 'Feb');

-- ── NEET GROWTH — Botany (Class 11) ──────────────────────────────
INSERT INTO lecture_plans (batch_type, subject, class_level, month_name, topic_name, planned_lectures, start_date) VALUES
('NEET Growth', 'Botany', '11', 'May', '[BOT] Cell – The Unit of Life',                                    6, 'May'),
('NEET Growth', 'Botany', '11', 'Jun', '[BOT] Cell – The Unit of Life + Cell Cycle & Division',            8, 'Jun'),
('NEET Growth', 'Botany', '11', 'Jul', '[BOT] Cell Cycle & Division + Living World + Biological Classification', 8, 'Jul'),
('NEET Growth', 'Botany', '11', 'Aug', '[BOT] Biological Classification',                                  8, 'Aug'),
('NEET Growth', 'Botany', '11', 'Sep', '[BOT] Plant Kingdom',                                              8, 'Sep'),
('NEET Growth', 'Botany', '11', 'Oct', '[BOT] Plant Kingdom + Morphology of Flowering Plants',            10, 'Oct'),
('NEET Growth', 'Botany', '11', 'Nov', '[BOT] Morphology + Anatomy of Flowering Plants',                   8, 'Nov'),
('NEET Growth', 'Botany', '11', 'Dec', '[BOT] Anatomy + Photosynthesis in Higher Plants',                 12, 'Dec'),
('NEET Growth', 'Botany', '11', 'Jan', '[BOT] Photosynthesis + Respiration in Plants',                     9, 'Jan'),
('NEET Growth', 'Botany', '11', 'Feb', '[BOT] Respiration + Plant Growth & Development',                   6, 'Feb');
-- =====================================================================
-- Migration 004: Seed Syllabus Topics (NEET + JEE chapters)
-- =====================================================================

-- ── PHYSICS Class 12 chapters ────────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000001', '12', 'Electric Charges and Fields', 1),
('b1000000-0000-0000-0000-000000000001', '12', 'Electrostatic Potential and Capacitance', 2),
('b1000000-0000-0000-0000-000000000001', '12', 'Current Electricity', 3),
('b1000000-0000-0000-0000-000000000001', '12', 'Moving Charges and Magnetism', 4),
('b1000000-0000-0000-0000-000000000001', '12', 'Magnetism and Matter', 5),
('b1000000-0000-0000-0000-000000000001', '12', 'Electromagnetic Induction', 6),
('b1000000-0000-0000-0000-000000000001', '12', 'Alternating Current', 7),
('b1000000-0000-0000-0000-000000000001', '12', 'Electromagnetic Waves', 8),
('b1000000-0000-0000-0000-000000000001', '12', 'Ray Optics and Optical Instruments', 9),
('b1000000-0000-0000-0000-000000000001', '12', 'Wave Optics', 10),
('b1000000-0000-0000-0000-000000000001', '12', 'Dual Nature of Radiation and Matter', 11),
('b1000000-0000-0000-0000-000000000001', '12', 'Atoms', 12),
('b1000000-0000-0000-0000-000000000001', '12', 'Nuclei', 13),
('b1000000-0000-0000-0000-000000000001', '12', 'Semiconductor Electronics', 14),
('b1000000-0000-0000-0000-000000000001', '12', 'Communication Systems', 15);

-- ── PHYSICS Class 11 chapters ────────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000001', '11', 'Physical World', 1),
('b1000000-0000-0000-0000-000000000001', '11', 'Units and Measurements', 2),
('b1000000-0000-0000-0000-000000000001', '11', 'Motion in a Straight Line', 3),
('b1000000-0000-0000-0000-000000000001', '11', 'Motion in a Plane', 4),
('b1000000-0000-0000-0000-000000000001', '11', 'Laws of Motion', 5),
('b1000000-0000-0000-0000-000000000001', '11', 'Work, Energy and Power', 6),
('b1000000-0000-0000-0000-000000000001', '11', 'System of Particles and Rotational Motion', 7),
('b1000000-0000-0000-0000-000000000001', '11', 'Gravitation', 8),
('b1000000-0000-0000-0000-000000000001', '11', 'Mechanical Properties of Solids', 9),
('b1000000-0000-0000-0000-000000000001', '11', 'Mechanical Properties of Fluids', 10),
('b1000000-0000-0000-0000-000000000001', '11', 'Thermal Properties of Matter', 11),
('b1000000-0000-0000-0000-000000000001', '11', 'Thermodynamics', 12),
('b1000000-0000-0000-0000-000000000001', '11', 'Kinetic Theory', 13),
('b1000000-0000-0000-0000-000000000001', '11', 'Oscillations', 14),
('b1000000-0000-0000-0000-000000000001', '11', 'Waves', 15);

-- ── CHEMISTRY Class 12 chapters ──────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000002', '12', 'Solid State', 1),
('b1000000-0000-0000-0000-000000000002', '12', 'Solutions', 2),
('b1000000-0000-0000-0000-000000000002', '12', 'Electrochemistry', 3),
('b1000000-0000-0000-0000-000000000002', '12', 'Chemical Kinetics', 4),
('b1000000-0000-0000-0000-000000000002', '12', 'Surface Chemistry', 5),
('b1000000-0000-0000-0000-000000000002', '12', 'General Principles and Processes of Isolation of Elements', 6),
('b1000000-0000-0000-0000-000000000002', '12', 'The p-Block Elements', 7),
('b1000000-0000-0000-0000-000000000002', '12', 'The d and f Block Elements', 8),
('b1000000-0000-0000-0000-000000000002', '12', 'Coordination Compounds', 9),
('b1000000-0000-0000-0000-000000000002', '12', 'Haloalkanes and Haloarenes', 10),
('b1000000-0000-0000-0000-000000000002', '12', 'Alcohols, Phenols and Ethers', 11),
('b1000000-0000-0000-0000-000000000002', '12', 'Aldehydes, Ketones and Carboxylic Acids', 12),
('b1000000-0000-0000-0000-000000000002', '12', 'Amines', 13),
('b1000000-0000-0000-0000-000000000002', '12', 'Biomolecules', 14),
('b1000000-0000-0000-0000-000000000002', '12', 'Polymers', 15),
('b1000000-0000-0000-0000-000000000002', '12', 'Chemistry in Everyday Life', 16),
('b1000000-0000-0000-0000-000000000002', '12', 'Stereoisomerism / Optical Isomerism', 17);

-- ── CHEMISTRY Class 11 chapters ──────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000002', '11', 'Some Basic Concepts of Chemistry', 1),
('b1000000-0000-0000-0000-000000000002', '11', 'Structure of Atom', 2),
('b1000000-0000-0000-0000-000000000002', '11', 'Classification of Elements and Periodicity', 3),
('b1000000-0000-0000-0000-000000000002', '11', 'Chemical Bonding and Molecular Structure', 4),
('b1000000-0000-0000-0000-000000000002', '11', 'States of Matter', 5),
('b1000000-0000-0000-0000-000000000002', '11', 'Thermodynamics', 6),
('b1000000-0000-0000-0000-000000000002', '11', 'Equilibrium', 7),
('b1000000-0000-0000-0000-000000000002', '11', 'Redox Reactions', 8),
('b1000000-0000-0000-0000-000000000002', '11', 'Hydrogen', 9),
('b1000000-0000-0000-0000-000000000002', '11', 'The s-Block Elements', 10),
('b1000000-0000-0000-0000-000000000002', '11', 'The p-Block Elements (Group 13 & 14)', 11),
('b1000000-0000-0000-0000-000000000002', '11', 'Organic Chemistry: Basic Principles', 12),
('b1000000-0000-0000-0000-000000000002', '11', 'Hydrocarbons', 13),
('b1000000-0000-0000-0000-000000000002', '11', 'Environmental Chemistry', 14);

-- ── BOTANY Class 12 chapters ─────────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000003', '12', 'Sexual Reproduction in Flowering Plants', 1),
('b1000000-0000-0000-0000-000000000003', '12', 'Principles of Inheritance and Variation', 2),
('b1000000-0000-0000-0000-000000000003', '12', 'Molecular Basis of Inheritance', 3),
('b1000000-0000-0000-0000-000000000003', '12', 'Evolution', 4),
('b1000000-0000-0000-0000-000000000003', '12', 'Microbes in Human Welfare', 5),
('b1000000-0000-0000-0000-000000000003', '12', 'Biotechnology Principles and Processes', 6),
('b1000000-0000-0000-0000-000000000003', '12', 'Biotechnology and its Applications', 7),
('b1000000-0000-0000-0000-000000000003', '12', 'Organisms and Populations', 8),
('b1000000-0000-0000-0000-000000000003', '12', 'Ecosystem', 9),
('b1000000-0000-0000-0000-000000000003', '12', 'Biodiversity and Conservation', 10),
('b1000000-0000-0000-0000-000000000003', '12', 'Environmental Issues', 11);

-- ── BOTANY Class 11 chapters ─────────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000003', '11', 'The Living World', 1),
('b1000000-0000-0000-0000-000000000003', '11', 'Biological Classification', 2),
('b1000000-0000-0000-0000-000000000003', '11', 'Plant Kingdom', 3),
('b1000000-0000-0000-0000-000000000003', '11', 'Morphology of Flowering Plants', 4),
('b1000000-0000-0000-0000-000000000003', '11', 'Anatomy of Flowering Plants', 5),
('b1000000-0000-0000-0000-000000000003', '11', 'Cell: The Unit of Life', 6),
('b1000000-0000-0000-0000-000000000003', '11', 'Cell Cycle and Cell Division', 7),
('b1000000-0000-0000-0000-000000000003', '11', 'Transport in Plants', 8),
('b1000000-0000-0000-0000-000000000003', '11', 'Mineral Nutrition', 9),
('b1000000-0000-0000-0000-000000000003', '11', 'Photosynthesis in Higher Plants', 10),
('b1000000-0000-0000-0000-000000000003', '11', 'Respiration in Plants', 11),
('b1000000-0000-0000-0000-000000000003', '11', 'Plant Growth and Development', 12);

-- ── ZOOLOGY Class 12 chapters ────────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000004', '12', 'Human Reproduction', 1),
('b1000000-0000-0000-0000-000000000004', '12', 'Reproductive Health', 2),
('b1000000-0000-0000-0000-000000000004', '12', 'Human Health and Disease', 3),
('b1000000-0000-0000-0000-000000000004', '12', 'Microbes in Human Welfare', 4),
('b1000000-0000-0000-0000-000000000004', '12', 'Biotechnology Principles and Processes', 5),
('b1000000-0000-0000-0000-000000000004', '12', 'Biotechnology and its Applications', 6),
('b1000000-0000-0000-0000-000000000004', '12', 'Origin and Evolution', 7);

-- ── ZOOLOGY Class 11 chapters ────────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000004', '11', 'Animal Kingdom', 1),
('b1000000-0000-0000-0000-000000000004', '11', 'Structural Organisation in Animals', 2),
('b1000000-0000-0000-0000-000000000004', '11', 'Biomolecules', 3),
('b1000000-0000-0000-0000-000000000004', '11', 'Digestion and Absorption', 4),
('b1000000-0000-0000-0000-000000000004', '11', 'Breathing and Exchange of Gases', 5),
('b1000000-0000-0000-0000-000000000004', '11', 'Body Fluids and Circulation', 6),
('b1000000-0000-0000-0000-000000000004', '11', 'Excretory Products and their Elimination', 7),
('b1000000-0000-0000-0000-000000000004', '11', 'Locomotion and Movement', 8),
('b1000000-0000-0000-0000-000000000004', '11', 'Neural Control and Coordination', 9),
('b1000000-0000-0000-0000-000000000004', '11', 'Chemical Coordination and Integration', 10);

-- ── MATHEMATICS Class 12 chapters ────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000005', '12', 'Relations and Functions', 1),
('b1000000-0000-0000-0000-000000000005', '12', 'Inverse Trigonometric Functions', 2),
('b1000000-0000-0000-0000-000000000005', '12', 'Matrices', 3),
('b1000000-0000-0000-0000-000000000005', '12', 'Determinants', 4),
('b1000000-0000-0000-0000-000000000005', '12', 'Continuity and Differentiability', 5),
('b1000000-0000-0000-0000-000000000005', '12', 'Application of Derivatives', 6),
('b1000000-0000-0000-0000-000000000005', '12', 'Integrals', 7),
('b1000000-0000-0000-0000-000000000005', '12', 'Application of Integrals', 8),
('b1000000-0000-0000-0000-000000000005', '12', 'Differential Equations', 9),
('b1000000-0000-0000-0000-000000000005', '12', 'Vector Algebra', 10),
('b1000000-0000-0000-0000-000000000005', '12', 'Three Dimensional Geometry', 11),
('b1000000-0000-0000-0000-000000000005', '12', 'Linear Programming', 12),
('b1000000-0000-0000-0000-000000000005', '12', 'Probability', 13),
('b1000000-0000-0000-0000-000000000005', '12', 'Statistics', 14);

-- ── MATHEMATICS Class 11 chapters ────────────────────────────────
INSERT INTO syllabus_topics (subject_id, class_level, chapter_name, chapter_order) VALUES
('b1000000-0000-0000-0000-000000000005', '11', 'Sets', 1),
('b1000000-0000-0000-0000-000000000005', '11', 'Relations and Functions', 2),
('b1000000-0000-0000-0000-000000000005', '11', 'Trigonometric Functions', 3),
('b1000000-0000-0000-0000-000000000005', '11', 'Principle of Mathematical Induction', 4),
('b1000000-0000-0000-0000-000000000005', '11', 'Complex Numbers and Quadratic Equations', 5),
('b1000000-0000-0000-0000-000000000005', '11', 'Linear Inequalities', 6),
('b1000000-0000-0000-0000-000000000005', '11', 'Permutations and Combinations', 7),
('b1000000-0000-0000-0000-000000000005', '11', 'Binomial Theorem', 8),
('b1000000-0000-0000-0000-000000000005', '11', 'Sequences and Series', 9),
('b1000000-0000-0000-0000-000000000005', '11', 'Straight Lines', 10),
('b1000000-0000-0000-0000-000000000005', '11', 'Conic Sections', 11),
('b1000000-0000-0000-0000-000000000005', '11', 'Introduction to Three Dimensional Geometry', 12),
('b1000000-0000-0000-0000-000000000005', '11', 'Limits and Derivatives', 13),
('b1000000-0000-0000-0000-000000000005', '11', 'Statistics', 14),
('b1000000-0000-0000-0000-000000000005', '11', 'Probability', 15);
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
