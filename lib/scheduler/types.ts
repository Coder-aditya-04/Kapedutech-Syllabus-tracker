export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening'
export type BatchType = 'JEE' | 'NEET' | 'Foundation'

export interface TeacherInfo {
  id: string
  name: string
  code: string
  subject: string
}

export interface BatchInfo {
  id: string
  name: string
  batchType: BatchType
  centerName: string
  timeSlot: TimeSlot
  slotsPerDay: number
  assignments: Record<string, TeacherInfo> // subject -> TeacherInfo
}

export interface TeacherAbsence {
  teacherId: string
  dayName: string
  slotIndex: number // -1 = full day
}

export interface ScheduleCell {
  batchId: string
  date: string
  slotIndex: number
  teacherId: string | null
  teacherCode: string
  subject: string
  isOverride: boolean
  isSundayExtra: boolean
  hasClash: boolean
}

export interface GenerateInput {
  batches: BatchInfo[]
  weekStart: string // YYYY-MM-DD (Monday)
  absences: TeacherAbsence[]
  // batchType -> subject -> lag (planned - done, higher = more behind)
  lagMap: Record<string, Record<string, number>>
  includeSunday: boolean
  offDays: Record<string, string[]> // batchId -> ['Monday', ...]
}
