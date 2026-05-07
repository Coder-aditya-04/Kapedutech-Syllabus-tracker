export const SUBJECT_COLORS: Record<string, string> = {
  Physics:     'bg-blue-100 text-blue-800 border-blue-200',
  Chemistry:   'bg-purple-100 text-purple-800 border-purple-200',
  Botany:      'bg-green-100 text-green-800 border-green-200',
  Zoology:     'bg-teal-100 text-teal-800 border-teal-200',
  Mathematics: 'bg-orange-100 text-orange-800 border-orange-200',
  Biology:     'bg-lime-100 text-lime-800 border-lime-200',
}

export const BATCH_TYPE_COLORS: Record<string, string> = {
  NEET_EXCEL:  'bg-purple-100 text-purple-800',
  NEET_GROWTH: 'bg-purple-50 text-purple-700',
  JEE_EXCEL:   'bg-green-100 text-green-800',
  JEE_GROWTH:  'bg-green-50 text-green-700',
  MHT_CET:     'bg-slate-100 text-slate-800',
  SSC_8TH:     'bg-emerald-100 text-emerald-800',
  SSC_9TH:     'bg-teal-100 text-teal-800',
  SSC_10TH:    'bg-cyan-100 text-cyan-800',
  CBSE_8TH:    'bg-pink-100 text-pink-800',
  CBSE_9TH:    'bg-rose-100 text-rose-800',
  CBSE_10TH:   'bg-red-100 text-red-800',
}

export const CENTER_COLORS: Record<string, string> = {
  'College Road': 'bg-blue-100 text-blue-900 border-blue-300',
  'Nashik Road':  'bg-purple-100 text-purple-900 border-purple-300',
}

export const SUBJECTS_BY_BATCH: Record<string, string[]> = {
  NEET_EXCEL:  ['Physics', 'Chemistry', 'Botany', 'Zoology'],
  NEET_GROWTH: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
  JEE_EXCEL:   ['Physics', 'Chemistry', 'Mathematics'],
  JEE_GROWTH:  ['Physics', 'Chemistry', 'Mathematics'],
  MHT_CET:     ['Physics', 'Chemistry', 'Mathematics'],
  SSC_8TH:     ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
  SSC_9TH:     ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
  SSC_10TH:    ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
  CBSE_8TH:    ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
  CBSE_9TH:    ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
  CBSE_10TH:   ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
}

export const CLASS_LEVELS = ['8', '9', '10', '11', '12'] as const
export const BATCH_TYPES = [
  'NEET_EXCEL', 'NEET_GROWTH',
  'JEE_EXCEL',  'JEE_GROWTH',
  'MHT_CET',
  'SSC_8TH',  'SSC_9TH',  'SSC_10TH',
  'CBSE_8TH', 'CBSE_9TH', 'CBSE_10TH',
] as const
export const SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology', 'Mathematics', 'Biology'] as const
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const
export const ACADEMIC_YEAR = '2026-27'
export const TIMEZONE = 'Asia/Kolkata'
