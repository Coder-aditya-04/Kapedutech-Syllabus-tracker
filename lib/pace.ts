import type { PaceStatus } from '@/lib/supabase/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const

// Academic year starts May 1, 2026. Week 1 = first week of May.
export function getAcademicWeek(): number {
  const start = new Date(2026, 4, 1) // May 1, 2026
  const now = new Date()
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
}

export function getCurrentMonthKey(): string {
  return MONTHS[new Date().getMonth()]
}

// Monthly planned lectures from the PLAN object (mirrors CFG.PLAN in GAS)
export const PLAN: Record<string, Record<string, Record<string, number>>> = {
  'NEET Excel': {
    Physics:   {Feb:10,Mar:21,Apr:10,May:10,Jun:28,Jul:10,Aug:9,Sep:18},
    Chemistry: {Mar:33,Apr:16,May:17,Jun:16,Jul:16,Aug:24,Sep:15,Oct:3},
    Botany:    {Mar:15,Apr:14,May:11,Jun:14,Aug:22},
    Zoology:   {Mar:24,May:6,Jun:18,Aug:5,Sep:3},
  },
  'JEE Excel': {
    Physics:   {Feb:10,Mar:21,Apr:36,May:10,Jun:13,Jul:16,Aug:15,Sep:29,Oct:4},
    Chemistry: {Feb:6,Mar:27,Apr:16,May:18,Jun:19,Jul:17,Aug:22,Sep:15,Oct:3},
    Mathematics:{Feb:30,Apr:24,May:25,Jun:20,Jul:12,Aug:29,Sep:14},
  },
  'NEET Growth': {
    Physics:   {May:11,Jun:16,Jul:16,Aug:16,Sep:16,Oct:20,Nov:15,Dec:24,Jan:19,Feb:12},
    Chemistry: {May:11,Jun:16,Jul:16,Aug:16,Sep:16,Oct:20,Nov:15,Dec:24,Jan:19,Feb:14},
    Botany:    {May:6,Jun:8,Jul:8,Aug:8,Sep:8,Oct:10,Nov:8,Dec:12,Jan:9,Feb:6},
    Zoology:   {May:5,Jun:8,Jul:8,Aug:8,Sep:8,Oct:10,Nov:7,Dec:12,Jan:10,Feb:6},
  },
  'JEE Growth': {
    Physics:   {May:11,Jun:16,Jul:16,Aug:16,Sep:16,Oct:20,Nov:15,Dec:24,Jan:19,Feb:7},
    Chemistry: {May:11,Jun:16,Jul:16,Aug:16,Sep:16,Oct:20,Nov:15,Dec:24,Jan:19,Feb:14},
    Mathematics:{May:11,Jun:16,Jul:16,Aug:16,Sep:16,Oct:20,Nov:15,Dec:24,Jan:19,Feb:15},
  },
}

export interface PaceResult {
  status: PaceStatus
  planned: number
  actual: number
  percent: number
  label: string
  emoji: string
}

export function calculatePace(
  batchType: string,
  subject: string,
  monthKey: string,
  actualLectures: number
): PaceResult {
  // Normalise batch name: strip trailing numbers/variants (e.g. "NEET Excel – 1" → "NEET Excel")
  const batchBase = batchType.replace(/\s*[–\-]\s*\d+.*$/, '').trim()
  const planned = PLAN[batchBase]?.[subject]?.[monthKey] ?? 0

  if (planned === 0) {
    return { status: 'no_entry', planned: 0, actual: actualLectures, percent: 0, label: 'No plan for this month', emoji: '⚪' }
  }

  const percent = Math.round((actualLectures / planned) * 100)

  if (actualLectures === 0) {
    return { status: 'no_entry', planned, actual: 0, percent: 0, label: 'No entry', emoji: '⚪' }
  } else if (percent < 70) {
    return { status: 'behind', planned, actual: actualLectures, percent, label: `Behind — ${percent}% of plan`, emoji: '🔴' }
  } else if (percent < 90) {
    return { status: 'slow', planned, actual: actualLectures, percent, label: `Slightly slow — ${percent}% of plan`, emoji: '🟡' }
  } else if (percent <= 115) {
    return { status: 'on_track', planned, actual: actualLectures, percent, label: `On track — ${percent}% of plan`, emoji: '🟢' }
  } else {
    return { status: 'fast', planned, actual: actualLectures, percent, label: `Too fast — ${percent}% of plan`, emoji: '🔵' }
  }
}

export function getPaceColor(status: PaceStatus): string {
  switch (status) {
    case 'behind':   return 'text-red-700 bg-red-50 border-red-200'
    case 'slow':     return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'on_track': return 'text-green-700 bg-green-50 border-green-200'
    case 'fast':     return 'text-blue-700 bg-blue-50 border-blue-200'
    default:         return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

export function getPaceBadgeVariant(status: PaceStatus) {
  switch (status) {
    case 'behind':   return 'destructive' as const
    case 'slow':     return 'outline' as const
    case 'on_track': return 'default' as const
    case 'fast':     return 'secondary' as const
    default:         return 'outline' as const
  }
}

export { MONTHS }
