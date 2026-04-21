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
