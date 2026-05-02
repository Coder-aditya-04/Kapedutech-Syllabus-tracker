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

// Sort subjects by lag descending, right-rotate by dayIndex
// Right-rotation: Mon [P,C,M] -> Tue [M,P,C] -> Wed [C,M,P]
function sortedRotate(subjects: string[], dayIndex: number, lag: Record<string, number>): string[] {
  const sorted = [...subjects].sort((a, b) => (lag[b] ?? 0) - (lag[a] ?? 0))
  const n = sorted.length
  if (n === 0) return []
  const shift = dayIndex % n
  return shift === 0 ? sorted : [...sorted.slice(n - shift), ...sorted.slice(0, n - shift)]
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
    const rotated = sortedRotate(subjects, dayIndex, lag)
    return rotated.slice(0, Math.min(n, subjects.length))
  }

  if (batch.batchType === 'NEET') {
    const pc = NEET_PC.filter(s => avail.includes(s))
    const bio = NEET_BIO.filter(s => avail.includes(s))
    const sortedBio = [...bio].sort((a, b) => (lag[b] ?? 0) - (lag[a] ?? 0))
    const bioSubject = sortedBio[dayIndex % Math.max(sortedBio.length, 1)]
    const sortedPC = sortedRotate(pc, dayIndex, lag)
    const day: string[] = []
    for (let i = 0; i < n; i++) {
      if (i < sortedPC.length) day.push(sortedPC[i])
      else if (bioSubject) day.push(bioSubject)
    }
    return day.slice(0, n)
  }

  // Foundation -- rotate through available subjects, no repeats within same day
  const fBase = FOUND_ROT.filter(s => avail.includes(s))
  if (fBase.length === 0) return avail.slice(0, n)
  const rotated = sortedRotate(fBase, dayIndex, lag)
  return rotated.slice(0, Math.min(n, fBase.length))
}

function isAbsent(tid: string, day: string, slot: number, absences: TeacherAbsence[]) {
  return absences.some(a =>
    a.teacherId === tid && a.dayName === day && (a.slotIndex === -1 || a.slotIndex === slot)
  )
}

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
