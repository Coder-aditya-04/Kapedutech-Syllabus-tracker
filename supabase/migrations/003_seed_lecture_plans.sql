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
