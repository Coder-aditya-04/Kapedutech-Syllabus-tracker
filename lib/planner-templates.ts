export interface TemplateEntry {
  subject: string
  topic_name: string
  planned_lectures: number
  month_name: string
}

export interface PlannerTemplate {
  batch_type: string
  class_level: string
  label: string
  entries: TemplateEntry[]
}

// Default month May = academic year start; user can edit individual rows later
const M = 'May'

export const PLANNER_TEMPLATES: Record<string, PlannerTemplate> = {

  // ── MHT-CET Excel (Class 12) ──────────────────────────────────────────────
  'mht-cet-excel': {
    batch_type: 'MHT-CET Excel',
    class_level: '12',
    label: 'MHT-CET Excel (12th)',
    entries: [
      // Physics — 147
      { subject: 'Physics', topic_name: 'Rotational Dynamics', planned_lectures: 10, month_name: M },
      { subject: 'Physics', topic_name: 'Oscillation', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Electrostatics', planned_lectures: 20, month_name: M },
      { subject: 'Physics', topic_name: 'Capacitance', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Current Electricity', planned_lectures: 10, month_name: M },
      { subject: 'Physics', topic_name: 'Magnetic Effect Of Current & Magnetism', planned_lectures: 15, month_name: M },
      { subject: 'Physics', topic_name: 'Electromagnetic Induction', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Alternating Current', planned_lectures: 7, month_name: M },
      { subject: 'Physics', topic_name: 'Geometrical Optics - 1', planned_lectures: 12, month_name: M },
      { subject: 'Physics', topic_name: 'Geometrical Optics - 2', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Superposition Of Wave', planned_lectures: 3, month_name: M },
      { subject: 'Physics', topic_name: 'Wave Optics & EMW', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Modern Physics', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Semiconductor', planned_lectures: 4, month_name: M },
      { subject: 'Physics', topic_name: 'Mechanical Properties Of Fluid', planned_lectures: 12, month_name: M },
      { subject: 'Physics', topic_name: 'KTG And Radiation', planned_lectures: 8, month_name: M },
      // Chemistry — 132
      { subject: 'Chemistry', topic_name: 'Alcohol, Phenol, Ether', planned_lectures: 9, month_name: M },
      { subject: 'Chemistry', topic_name: 'Carbonyl Compound, Carboxylic Acid', planned_lectures: 9, month_name: M },
      { subject: 'Chemistry', topic_name: 'Amines', planned_lectures: 8, month_name: M },
      { subject: 'Chemistry', topic_name: 'Bio-Molecules', planned_lectures: 6, month_name: M },
      { subject: 'Chemistry', topic_name: 'Thermodynamics', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'Ionic Equilibrium', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'Liquid Solution', planned_lectures: 8, month_name: M },
      { subject: 'Chemistry', topic_name: 'Electrochemistry', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'Chemical Kinetics', planned_lectures: 7, month_name: M },
      { subject: 'Chemistry', topic_name: 'Solid State', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'D&F Block', planned_lectures: 4, month_name: M },
      { subject: 'Chemistry', topic_name: 'Coordination Chemistry', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'P-Block', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'Salt Analysis', planned_lectures: 3, month_name: M },
      { subject: 'Chemistry', topic_name: 'Polymer, Green Chemistry', planned_lectures: 4, month_name: M },
      { subject: 'Chemistry', topic_name: 'Nano Chemistry', planned_lectures: 2, month_name: M },
      // Mathematics — 136
      { subject: 'Mathematics', topic_name: 'ITF', planned_lectures: 9, month_name: M },
      { subject: 'Mathematics', topic_name: 'Matrices & Determinants', planned_lectures: 15, month_name: M },
      { subject: 'Mathematics', topic_name: 'Differentiability & Methods Of Differentiation', planned_lectures: 12, month_name: M },
      { subject: 'Mathematics', topic_name: 'Application Of Derivatives', planned_lectures: 15, month_name: M },
      { subject: 'Mathematics', topic_name: 'Indefinite Integral', planned_lectures: 12, month_name: M },
      { subject: 'Mathematics', topic_name: 'Definite Integral & Area Under The Curve', planned_lectures: 12, month_name: M },
      { subject: 'Mathematics', topic_name: 'Differential Equation', planned_lectures: 7, month_name: M },
      { subject: 'Mathematics', topic_name: 'Vector & 3D Geometry', planned_lectures: 22, month_name: M },
      { subject: 'Mathematics', topic_name: 'Probability Distribution', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Binomial Distribution', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'LPP', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Pair Of Straight Line', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Conic Section', planned_lectures: 15, month_name: M },
      { subject: 'Mathematics', topic_name: 'Mathematical Logic', planned_lectures: 4, month_name: M },
    ],
  },

  // ── MHT-CET Growth (Class 11) ─────────────────────────────────────────────
  'mht-cet-growth': {
    batch_type: 'MHT-CET Growth',
    class_level: '11',
    label: 'MHT-CET Growth (11th)',
    entries: [
      // Physics — 141
      { subject: 'Physics', topic_name: 'Basic Mathematics', planned_lectures: 20, month_name: M },
      { subject: 'Physics', topic_name: 'Units & Dimensions', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Vector', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Motion In Plane (1D)', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Motion In Plane (2D)', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Laws Of Motion', planned_lectures: 15, month_name: M },
      { subject: 'Physics', topic_name: 'Work Power & Energy', planned_lectures: 7, month_name: M },
      { subject: 'Physics', topic_name: 'Circular Motion', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Gravitation', planned_lectures: 9, month_name: M },
      { subject: 'Physics', topic_name: 'Thermal Properties Of Matters', planned_lectures: 10, month_name: M },
      { subject: 'Physics', topic_name: 'Wave & Sound', planned_lectures: 13, month_name: M },
      { subject: 'Physics', topic_name: 'Ray Optics', planned_lectures: 20, month_name: M },
      { subject: 'Physics', topic_name: 'Semiconductor', planned_lectures: 10, month_name: M },
      { subject: 'Physics', topic_name: 'Electrostatics - 1', planned_lectures: 5, month_name: M },
      // Chemistry — 126
      { subject: 'Chemistry', topic_name: 'Some Basic Concepts Of Chemistry', planned_lectures: 15, month_name: M },
      { subject: 'Chemistry', topic_name: 'Structure Of Atom', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'Classification Of Element & Periodicity', planned_lectures: 8, month_name: M },
      { subject: 'Chemistry', topic_name: 'Chemical Bonding', planned_lectures: 15, month_name: M },
      { subject: 'Chemistry', topic_name: 'Redox Reaction', planned_lectures: 6, month_name: M },
      { subject: 'Chemistry', topic_name: 'Elements Of Group 1 & 2', planned_lectures: 6, month_name: M },
      { subject: 'Chemistry', topic_name: 'State Of Matter Gaseous And Liquid State', planned_lectures: 10, month_name: M },
      { subject: 'Chemistry', topic_name: 'Surface Chemistry', planned_lectures: 10, month_name: M },
      { subject: 'Chemistry', topic_name: 'Basic Principal Of Organic Chemistry', planned_lectures: 20, month_name: M },
      { subject: 'Chemistry', topic_name: 'Hydrocarbon', planned_lectures: 12, month_name: M },
      { subject: 'Chemistry', topic_name: 'Haloalkane & Haloarene', planned_lectures: 12, month_name: M },
      // Mathematics — 118
      { subject: 'Mathematics', topic_name: 'Fundamental Of Mathematics', planned_lectures: 20, month_name: M },
      { subject: 'Mathematics', topic_name: 'Logarithm', planned_lectures: 8, month_name: M },
      { subject: 'Mathematics', topic_name: 'Sequence & Series', planned_lectures: 12, month_name: M },
      { subject: 'Mathematics', topic_name: 'Compound Angle', planned_lectures: 10, month_name: M },
      { subject: 'Mathematics', topic_name: 'Trigonometric Equations', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Quadratic Equation', planned_lectures: 8, month_name: M },
      { subject: 'Mathematics', topic_name: 'Straight Line', planned_lectures: 10, month_name: M },
      { subject: 'Mathematics', topic_name: 'Circle', planned_lectures: 7, month_name: M },
      { subject: 'Mathematics', topic_name: 'Binomial Theorem', planned_lectures: 10, month_name: M },
      { subject: 'Mathematics', topic_name: 'Permutation & Combination', planned_lectures: 10, month_name: M },
      { subject: 'Mathematics', topic_name: 'Probability', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Complex Number', planned_lectures: 10, month_name: M },
      { subject: 'Mathematics', topic_name: 'Statistics', planned_lectures: 3, month_name: M },
    ],
  },

  // ── SSC 8th ───────────────────────────────────────────────────────────────
  'ssc-8th': {
    batch_type: 'SSC 8th',
    class_level: '8',
    label: 'SSC 8th',
    entries: [
      // Physics
      { subject: 'Physics', topic_name: 'Force and Pressure', planned_lectures: 4, month_name: M },
      { subject: 'Physics', topic_name: 'Current Electricity and Magnetism', planned_lectures: 4, month_name: M },
      { subject: 'Physics', topic_name: 'Measurement and Effect of Heat', planned_lectures: 4, month_name: M },
      { subject: 'Physics', topic_name: 'Sound', planned_lectures: 4, month_name: M },
      { subject: 'Physics', topic_name: 'Reflection of Light', planned_lectures: 4, month_name: M },
      // Chemistry
      { subject: 'Chemistry', topic_name: 'Inside the Atom', planned_lectures: 6, month_name: M },
      { subject: 'Chemistry', topic_name: 'Composition of Matter', planned_lectures: 6, month_name: M },
      { subject: 'Chemistry', topic_name: 'Metals & Non-metal', planned_lectures: 4, month_name: M },
      { subject: 'Chemistry', topic_name: 'Introduction to Acid & Base', planned_lectures: 3, month_name: M },
      { subject: 'Chemistry', topic_name: 'Chemical Change & Chemical Bond', planned_lectures: 3, month_name: M },
      // Biology
      { subject: 'Biology', topic_name: 'Living World and Classification of Microbes', planned_lectures: 4, month_name: M },
      { subject: 'Biology', topic_name: 'Health & Disease', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Pollution', planned_lectures: 5, month_name: M },
      { subject: 'Biology', topic_name: 'Disaster Management', planned_lectures: 4, month_name: M },
      { subject: 'Biology', topic_name: 'Cell & Cell Organelles', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Human Body and Organ System', planned_lectures: 7, month_name: M },
      { subject: 'Biology', topic_name: 'Ecosystem', planned_lectures: 5, month_name: M },
      // Mathematics
      { subject: 'Mathematics', topic_name: 'Rational and Irrational Numbers', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Parallel Lines and Transversal', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Indices and Cube Root', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Altitudes and Medians of a Triangle', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Expansion Formulae', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Factorisation of Algebraic Expressions', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Variation', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Quadrilateral: Construction and Types', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Discount and Commission', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Division of Polynomials', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Statistics', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Equations in One Variable', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Congruence of Triangles', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Compound Interest', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Area', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Surface Area and Volume', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Circle: Chord and Arc', planned_lectures: 4, month_name: M },
    ],
  },

  // ── SSC 9th ───────────────────────────────────────────────────────────────
  'ssc-9th': {
    batch_type: 'SSC 9th',
    class_level: '9',
    label: 'SSC 9th',
    entries: [
      // Physics
      { subject: 'Physics', topic_name: 'Law of Motion', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Work and Energy', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Current Electricity', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Reflection of Light', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Study of Sound', planned_lectures: 5, month_name: M },
      // Chemistry
      { subject: 'Chemistry', topic_name: 'Measurement of Matter', planned_lectures: 6, month_name: M },
      { subject: 'Chemistry', topic_name: 'Acid, Base & Salts', planned_lectures: 8, month_name: M },
      { subject: 'Chemistry', topic_name: 'Carbon: An Important Element', planned_lectures: 5, month_name: M },
      // Biology
      { subject: 'Biology', topic_name: 'Classification of Plants', planned_lectures: 4, month_name: M },
      { subject: 'Biology', topic_name: 'Energy Flow in an Ecosystem', planned_lectures: 5, month_name: M },
      { subject: 'Biology', topic_name: 'Useful & Harmful Microbes', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Environmental Management', planned_lectures: 8, month_name: M },
      { subject: 'Biology', topic_name: 'Life Processes in Living Organism', planned_lectures: 10, month_name: M },
      { subject: 'Biology', topic_name: 'Heredity and Variation', planned_lectures: 8, month_name: M },
      { subject: 'Biology', topic_name: 'Introduction to Biotechnology', planned_lectures: 10, month_name: M },
      // Mathematics
      { subject: 'Mathematics', topic_name: 'Sets', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Real Numbers', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Polynomials', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Ratio and Proportion', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Linear Equations in Two Variables', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Financial Planning', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Statistics', planned_lectures: 4, month_name: M },
    ],
  },

  // ── SSC 10th ──────────────────────────────────────────────────────────────
  'ssc-10th': {
    batch_type: 'SSC 10th',
    class_level: '10',
    label: 'SSC 10th',
    entries: [
      // Physics
      { subject: 'Physics', topic_name: 'Gravitation', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Effects of Electric Current', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Heat', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Refraction of Light', planned_lectures: 7, month_name: M },
      { subject: 'Physics', topic_name: 'Lenses', planned_lectures: 9, month_name: M },
      // Chemistry
      { subject: 'Chemistry', topic_name: 'Periodic Classification of Elements', planned_lectures: 8, month_name: M },
      { subject: 'Chemistry', topic_name: 'Chemical Reactions & Equation', planned_lectures: 7, month_name: M },
      { subject: 'Chemistry', topic_name: 'Metallurgy', planned_lectures: 10, month_name: M },
      { subject: 'Chemistry', topic_name: 'Carbon Compounds', planned_lectures: 10, month_name: M },
      // Biology
      { subject: 'Biology', topic_name: 'Heredity & Evolution', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Life Processes in Living Organism Part-1', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Life Processes in Living Organism Part-2', planned_lectures: 7, month_name: M },
      { subject: 'Biology', topic_name: 'Environmental Management', planned_lectures: 7, month_name: M },
      { subject: 'Biology', topic_name: 'Animal Classification', planned_lectures: 9, month_name: M },
      { subject: 'Biology', topic_name: 'Introduction to Microbiology', planned_lectures: 8, month_name: M },
      { subject: 'Biology', topic_name: 'Cell Biology & Biotechnology', planned_lectures: 9, month_name: M },
      { subject: 'Biology', topic_name: 'Social Health', planned_lectures: 4, month_name: M },
      { subject: 'Biology', topic_name: 'Disaster Management', planned_lectures: 6, month_name: M },
      // Mathematics
      { subject: 'Mathematics', topic_name: 'Arithmetic Progression', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Quadratic Equations', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Linear Equations in Two Variables', planned_lectures: 7, month_name: M },
      { subject: 'Mathematics', topic_name: 'Financial Planning', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Probability', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Graph and Measures of Central Tendencies', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Similar Triangles', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Circle', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Co-ordinate Geometry', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Surface Area and Volume', planned_lectures: 8, month_name: M },
      { subject: 'Mathematics', topic_name: 'Trigonometry', planned_lectures: 8, month_name: M },
    ],
  },

  // ── CBSE 8th ──────────────────────────────────────────────────────────────
  'cbse-8th': {
    batch_type: 'CBSE 8th',
    class_level: '8',
    label: 'CBSE 8th',
    entries: [
      // Physics
      { subject: 'Physics', topic_name: 'Exploring the Investigative World of Science', planned_lectures: 3, month_name: M },
      { subject: 'Physics', topic_name: 'Electricity: Magnetic and Heating Effects', planned_lectures: 5, month_name: M },
      { subject: 'Physics', topic_name: 'Exploring Forces', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Pressure, Winds, Storms, and Cyclones', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Light: Mirrors and Lenses', planned_lectures: 7, month_name: M },
      { subject: 'Physics', topic_name: 'Keeping Time with the Skies', planned_lectures: 4, month_name: M },
      { subject: 'Physics', topic_name: 'Our Home: Earth, A Unique Life Sustaining Planet', planned_lectures: 4, month_name: M },
      // Chemistry
      { subject: 'Chemistry', topic_name: 'Particle Nature of Matter', planned_lectures: 5, month_name: M },
      { subject: 'Chemistry', topic_name: 'Nature of Matter: Elements, Compounds and Its Mixtures', planned_lectures: 8, month_name: M },
      { subject: 'Chemistry', topic_name: 'The Amazing World of Solute, Solvents and Solutions', planned_lectures: 5, month_name: M },
      // Biology
      { subject: 'Biology', topic_name: 'The Invisible World: Beyond Our Naked Eye', planned_lectures: 7, month_name: M },
      { subject: 'Biology', topic_name: 'Health: The Ultimate Treasure', planned_lectures: 8, month_name: M },
      { subject: 'Biology', topic_name: 'How Nature Works in Harmony', planned_lectures: 7, month_name: M },
      { subject: 'Biology', topic_name: 'Our Home: Earth, A Unique Life Sustaining Planet', planned_lectures: 10, month_name: M },
      // Mathematics
      { subject: 'Mathematics', topic_name: 'A Square and a Cube', planned_lectures: 8, month_name: M },
      { subject: 'Mathematics', topic_name: 'Power Play', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'A Story of Numbers', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Quadrilaterals', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Number Play', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'We Distribute, Yet Things Multiply', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Proportional Reasoning', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Fraction in Disguise', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'The Baudhayana-Pythagoras Theorem', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Exploring Some Geometric Themes', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Tales by Date and Lines', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Algebra Play', planned_lectures: 8, month_name: M },
      { subject: 'Mathematics', topic_name: 'Area', planned_lectures: 8, month_name: M },
    ],
  },

  // ── CBSE 9th ──────────────────────────────────────────────────────────────
  'cbse-9th': {
    batch_type: 'CBSE 9th',
    class_level: '9',
    label: 'CBSE 9th',
    entries: [
      // Mathematics
      { subject: 'Mathematics', topic_name: 'Number System', planned_lectures: 7, month_name: M },
      { subject: 'Mathematics', topic_name: 'Polynomials', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Coordinate Geometry', planned_lectures: 1, month_name: M },
      { subject: 'Mathematics', topic_name: 'Linear Equations in Two Variables', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: "Introduction to Euclid's Geometry", planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Lines and Angles', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Triangles', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Quadrilaterals', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Circles', planned_lectures: 7, month_name: M },
      { subject: 'Mathematics', topic_name: "Heron's Formula", planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Surface Areas and Volumes', planned_lectures: 5, month_name: M },
      { subject: 'Mathematics', topic_name: 'Statistics', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Areas of Parallelograms and Triangles', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Constructions', planned_lectures: 2, month_name: M },
      // Physics
      { subject: 'Physics', topic_name: 'Units & Measurements + Basic Mathematics', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Vector', planned_lectures: 5, month_name: M },
      { subject: 'Physics', topic_name: 'Kinematics - 1D', planned_lectures: 9, month_name: M },
      { subject: 'Physics', topic_name: 'Kinematics - 2D', planned_lectures: 2, month_name: M },
      { subject: 'Physics', topic_name: 'Force and NLM', planned_lectures: 7, month_name: M },
      { subject: 'Physics', topic_name: 'Gravitation', planned_lectures: 9, month_name: M },
      { subject: 'Physics', topic_name: 'Work Energy & Power', planned_lectures: 7, month_name: M },
      { subject: 'Physics', topic_name: 'Sound', planned_lectures: 7, month_name: M },
      // Chemistry
      { subject: 'Chemistry', topic_name: 'Matter in Our Surrounding', planned_lectures: 5, month_name: M },
      { subject: 'Chemistry', topic_name: 'Is Matter Around Us Pure', planned_lectures: 5, month_name: M },
      { subject: 'Chemistry', topic_name: 'Atom and Molecules', planned_lectures: 7, month_name: M },
      { subject: 'Chemistry', topic_name: 'Structure of Atoms', planned_lectures: 8, month_name: M },
      // Biology
      { subject: 'Biology', topic_name: 'Cell - The Unit of Life', planned_lectures: 10, month_name: M },
      { subject: 'Biology', topic_name: 'Plant Tissue', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Animal Tissue', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Fluid Tissue', planned_lectures: 3, month_name: M },
      { subject: 'Biology', topic_name: 'Diversity in Living Organisms', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Kingdom Animalia', planned_lectures: 7, month_name: M },
      { subject: 'Biology', topic_name: 'Why Do We Fall Ill', planned_lectures: 7, month_name: M },
      { subject: 'Biology', topic_name: 'Natural Resources', planned_lectures: 10, month_name: M },
      { subject: 'Biology', topic_name: 'Improvement of Food Resources', planned_lectures: 10, month_name: M },
    ],
  },

  // ── CBSE 10th ─────────────────────────────────────────────────────────────
  'cbse-10th': {
    batch_type: 'CBSE 10th',
    class_level: '10',
    label: 'CBSE 10th',
    entries: [
      // Mathematics
      { subject: 'Mathematics', topic_name: 'Real Number', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Polynomials', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Pair of Linear Equations', planned_lectures: 8, month_name: M },
      { subject: 'Mathematics', topic_name: 'Quadratic Equation', planned_lectures: 6, month_name: M },
      { subject: 'Mathematics', topic_name: 'Arithmetic Progression', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Coordinate Geometry', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Triangles', planned_lectures: 4, month_name: M },
      { subject: 'Mathematics', topic_name: 'Circles', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Introduction to Trigonometry', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Trigonometric Identities', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Height & Distance', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Area Related to Circle', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Surface Area & Volume', planned_lectures: 3, month_name: M },
      { subject: 'Mathematics', topic_name: 'Statistics', planned_lectures: 2, month_name: M },
      { subject: 'Mathematics', topic_name: 'Probability', planned_lectures: 2, month_name: M },
      // Physics
      { subject: 'Physics', topic_name: 'Units & Measurements, Basic Mathematics and Vector', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Kinematics - 1D', planned_lectures: 10, month_name: M },
      { subject: 'Physics', topic_name: 'Kinematics - 2D', planned_lectures: 2, month_name: M },
      { subject: 'Physics', topic_name: 'Light Reflection and Refraction', planned_lectures: 7, month_name: M },
      { subject: 'Physics', topic_name: 'Human Eye and Colourful World', planned_lectures: 5, month_name: M },
      { subject: 'Physics', topic_name: 'Electricity', planned_lectures: 8, month_name: M },
      { subject: 'Physics', topic_name: 'Magnetic Effects of Electric Current', planned_lectures: 6, month_name: M },
      { subject: 'Physics', topic_name: 'Our Environment', planned_lectures: 1, month_name: M },
      // Chemistry
      { subject: 'Chemistry', topic_name: 'Chemical Reactions and Equations', planned_lectures: 6, month_name: M },
      { subject: 'Chemistry', topic_name: 'Acids, Bases and Salts', planned_lectures: 11, month_name: M },
      { subject: 'Chemistry', topic_name: 'Metals and Non-Metals', planned_lectures: 7, month_name: M },
      { subject: 'Chemistry', topic_name: 'Carbon and Its Compounds', planned_lectures: 16, month_name: M },
      { subject: 'Chemistry', topic_name: 'Periodic Classification of Elements', planned_lectures: 4, month_name: M },
      // Biology
      { subject: 'Biology', topic_name: 'Life Process (Nutrition)', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Life Process (Respiration)', planned_lectures: 3, month_name: M },
      { subject: 'Biology', topic_name: 'Life Process (Transportation)', planned_lectures: 6, month_name: M },
      { subject: 'Biology', topic_name: 'Life Process (Excretion)', planned_lectures: 3, month_name: M },
      { subject: 'Biology', topic_name: 'Control and Co-ordination', planned_lectures: 9, month_name: M },
      { subject: 'Biology', topic_name: 'How do Organisms Reproduce', planned_lectures: 9, month_name: M },
      { subject: 'Biology', topic_name: 'Heredity', planned_lectures: 5, month_name: M },
      { subject: 'Biology', topic_name: 'Our Environment', planned_lectures: 6, month_name: M },
    ],
  },
}
