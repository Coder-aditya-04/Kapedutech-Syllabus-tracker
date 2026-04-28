import type { BatchInfo, TeacherAbsence, ScheduleCell, GenerateInput } from './types'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const JEE_BASE   = ['Physics', 'Chemistry', 'Maths']
const NEET_PC    = ['Physics', 'Chemistry']
const NEET_BIO   = ['Botany', 'Zoology']
const FOUND_ROT  = ['Maths', 'Physics', 'Chemistry', 'Biology', 'English', 'SST', 'MAT']

// ── Helpers ────────────────────────────────────────────────────────────────

function getWeekDates(weekStart: string, includeSunday: boolean): string[] {
  const dates: string[] = []
  const start = new Date(weekStart + 'T12:00:00')
  const days = includeSunday ? 7 : 6
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

// Sort subjects by lag descending, rotate by dayIndex for variety
function sortedRotate(subjects: string[], dayIndex: number, lag: Record<string, number>): string[] {
  const sorted = [...subjects].sort((a, b) => (lag[b] ?? 0) - (lag[a] ?? 0))
  const shift = dayIndex % sorted.length
  return [...sorted.slice(shift), ...sorted.slice(0, shift)]
}

function getSubjectsForDay(
  batch: BatchInfo,
  dayIndex: number,
  lag: Record<string, number>
): string[] {
  const avail = Object.keys(batch.assignments)
  const n = batch.slotsPerDay

  if (batch.batchType === 'JEE') {
    const subjects = JEE_BASE.filter(s => avail.includes(s))
    return sortedRotate(subjects, dayIndex, lag).slice(0, n)
  }

  if (batch.batchType === 'NEET') {
    const pc = NEET_PC.filter(s => avail.includes(s))
    const bio = NEET_BIO.filter(s => avail.includes(s))
    // Bio alternates by day, sorted by lag so higher-lag bio comes first
    const sortedBio = [...bio].sort((a, b) => (lag[b] ?? 0) - (lag[a] ?? 0))
    const bioSubject = sortedBio[dayIndex % Math.max(sortedBio.length, 1)]
    const sortedPC = sortedRotate(pc, dayIndex, lag)
    // Slots: [PC[0], PC[1], bio, bio?] up to n
    const day: string[] = []
    for (let i = 0; i < n; i++) {
      if (i < sortedPC.length) day.push(sortedPC[i])
      else if (bioSubject) day.push(bioSubject)
    }
    return day.slice(0, n)
  }

  // Foundation — fixed rotation through 7 subjects
  const fBase = FOUND_ROT.filter(s => avail.includes(s))
  if (fBase.length === 0) return avail.slice(0, n)
  const result: string[] = []
  for (let i = 0; i < n; i++) {
    result.push(fBase[(dayIndex * n + i) % fBase.length])
  }
  return result
}

function isAbsent(tid: string, day: string, slot: number, absences: TeacherAbsence[]) {
  return absences.some(a =>
    a.teacherId === tid && a.dayName === day && (a.slotIndex === -1 || a.slotIndex === slot)
  )
}

// A teacher clashes if already assigned at same date+slotIndex
// (We don't need to check timeSlot — slotIndex 0 of Morning ≠ slotIndex 0 of Afternoon
// because Morning batches and Afternoon batches occupy different real-time windows.
// So clash key = teacherId + date + timeSlot + slotIndex)
function isBusy(
  tid: string, date: string, slotIndex: number, timeSlot: string,
  existing: ScheduleCell[], batches: BatchInfo[]
) {
  return existing.some(s => {
    if (s.teacherId !== tid || s.date !== date || s.slotIndex !== slotIndex) return false
    const b = batches.find(b => b.id === s.batchId)
    return b?.timeSlot === timeSlot
  })
}

// ── Main Engine ─────────────────────────────────────────────────────────────

export function generateSchedule(input: GenerateInput): ScheduleCell[] {
  const { batches, weekStart, absences, lagMap, includeSunday, offDays } = input
  const dates = getWeekDates(weekStart, includeSunday)
  const cells: ScheduleCell[] = []

  dates.forEach((date, dayIndex) => {
    const dayName = DAY_NAMES[dayIndex]

    batches.forEach(batch => {
      if ((offDays[batch.id] ?? []).includes(dayName)) return

      const lag = lagMap[batch.batchType] ?? {}
      const subjects = getSubjectsForDay(batch, dayIndex, lag)

      subjects.forEach((subject, slotIndex) => {
        const teacher = batch.assignments[subject]
        let teacherId: string | null = null
        let teacherCode = '—'
        let hasClash = false

        if (teacher) {
          const absent = isAbsent(teacher.id, dayName, slotIndex, absences)
          const busy   = isBusy(teacher.id, date, slotIndex, batch.timeSlot, cells, batches)

          if (!absent && !busy) {
            teacherId   = teacher.id
            teacherCode = teacher.code || teacher.name.slice(0, 2).toUpperCase()
          } else {
            hasClash    = true
            teacherCode = absent ? '🤒' : '⚠️'
          }
        }

        cells.push({
          batchId: batch.id,
          date,
          slotIndex,
          teacherId,
          teacherCode,
          subject,
          isOverride: false,
          isSundayExtra: dayIndex === 6,
          hasClash,
        })
      })
    })
  })

  return cells
}
