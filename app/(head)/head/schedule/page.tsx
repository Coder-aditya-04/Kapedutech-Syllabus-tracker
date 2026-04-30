import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleGrid, GenerateButton, AbsenceManager } from '@/components/schedule/ScheduleGrid'

interface RawBatch {
  id: string; name: string; batch_type: string | null; time_slot: string | null
  slots_per_day: number | null; centers: { name: string } | null
}
interface RawAssignment {
  batch_id: string; subject: string
  user_profiles: { id: string; name: string; teacher_code: string | null } | null
}
interface RawScheduleRow {
  id: string; week_start: string; batch_id: string; date: string; slot_index: number
  teacher_id: string | null; subject: string; is_override: boolean; is_sunday_extra: boolean
}
interface RawAbsence { id: string; teacher_id: string; week_start: string; day_name: string; slot_index: number }
interface RawOffDay  { batch_id: string; day_name: string }

export const revalidate = 0

// Get Monday of the week containing a given date
function getMondayOf(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(weekStart: string) {
  const start = new Date(weekStart + 'T12:00:00')
  const end   = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 5)
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}

function prevWeek(w: string) {
  const d = new Date(w + 'T12:00:00')
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

function nextWeek(w: string) {
  const d = new Date(w + 'T12:00:00')
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

interface Props { searchParams: Promise<{ week?: string; sunday?: string }> }

export default async function SchedulePage({ searchParams }: Props) {
  const params = await searchParams

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()
  if (!profile || !['academic_head', 'director'].includes(profile.role)) redirect('/teacher/log')

  const today = new Date().toISOString().split('T')[0]
  const weekStart = getMondayOf(params?.week ?? today)
  const includeSunday = params?.sunday === '1'

  const admin = createAdminClient()

  // Handle gracefully — new columns/tables may not exist until SQL migrations are run
  async function safeQuery<T>(q: PromiseLike<{ data: T | null }>) {
    try { const r = await Promise.resolve(q); return r.data } catch { return null }
  }

  // ── Fetch data ─────────────────────────────────────────────────────────
  // time_slot / slots_per_day / teacher_code may not exist yet → safeQuery returns null on 400
  const [rawBatches, rawAssignments] = await Promise.all([
    safeQuery(admin.from('batches')
      .select('id, name, batch_type, time_slot, slots_per_day, centers(name)')
      .eq('is_active', true)),
    safeQuery(admin.from('teacher_batch_assignments')
      .select('batch_id, subject, user_profiles(id, name, teacher_code)')
      .eq('is_active', true)),
  ])
  const rawSchedule    = await safeQuery(admin.from('weekly_schedule').select('*').eq('week_start', weekStart))
  const rawAbsences    = await safeQuery(admin.from('teacher_absences').select('*').eq('week_start', weekStart))
  const rawOffDays     = await safeQuery(admin.from('batch_offdays').select('batch_id, day_name').eq('week_start', weekStart))

  const batches = (rawBatches as unknown as RawBatch[] ?? []).map(b => ({
    id: b.id,
    name: b.name,
    batch_type: b.batch_type ?? 'JEE',
    time_slot: b.time_slot ?? 'Morning',
    slots_per_day: b.slots_per_day ?? 3,
    center_name: b.centers?.name ?? 'Unknown',
  }))

  // All teachers from assignments (deduplicated)
  const teacherMap = new Map<string, { id: string; name: string; teacher_code: string | null; subject: string }>()
  for (const a of (rawAssignments as unknown as RawAssignment[] ?? [])) {
    if (a.user_profiles) {
      teacherMap.set(a.user_profiles.id, {
        id: a.user_profiles.id,
        name: a.user_profiles.name,
        teacher_code: a.user_profiles.teacher_code ?? null,
        subject: a.subject,
      })
    }
  }
  const teachers = Array.from(teacherMap.values())

  const needsMigration = rawSchedule === null || rawBatches === null
  const schedule = (rawSchedule as unknown as RawScheduleRow[]) ?? []
  const absences = (rawAbsences as unknown as RawAbsence[]) ?? []
  const offDays  = (rawOffDays  as unknown as RawOffDay[])  ?? []

  // Detect clashes: same teacher, same date, same slotIndex, same timeSlot
  const busySet = new Set<string>()
  const clashBatchIds = new Set<string>()
  for (const s of schedule) {
    if (!s.teacher_id) continue
    const batch = batches.find(b => b.id === s.batch_id)
    const key = `${s.teacher_id}-${s.date}-${s.slot_index}-${batch?.time_slot ?? 'Morning'}`
    if (busySet.has(key)) {
      clashBatchIds.add(s.batch_id)
    } else {
      busySet.add(key)
    }
  }

  const prev = prevWeek(weekStart)
  const next = nextWeek(weekStart)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">📅 Weekly Schedule</h1>
          <p className="text-gray-500 mt-1 text-base">
            AI-generated, clash-free timetable based on real submission lag data
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 relative">
          <GenerateButton weekStart={weekStart} includeSunday={includeSunday} />
          <AbsenceManager weekStart={weekStart} absences={absences} teachers={teachers} />
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-6 py-4 mb-6 shadow-sm">
        <a href={`/head/schedule?week=${prev}`}
          className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          ← Prev week
        </a>
        <div className="text-center">
          <div className="font-black text-gray-900">{formatWeekLabel(weekStart)}</div>
          <div className="text-xs text-gray-400">Week of {weekStart}</div>
        </div>
        <a href={`/head/schedule?week=${next}`}
          className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          Next week →
        </a>
      </div>

      {/* Migration banner */}
      {needsMigration && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="font-black text-amber-800 mb-1">⚠️ Database setup required</p>
          <p className="text-sm text-amber-700">Run the SQL migrations in Supabase to create <code className="bg-amber-100 px-1 rounded">weekly_schedule</code>, <code className="bg-amber-100 px-1 rounded">teacher_absences</code>, and <code className="bg-amber-100 px-1 rounded">batch_offdays</code> tables. SQL is in the conversation above.</p>
        </div>
      )}

      {/* Clash warning */}
      {clashBatchIds.size > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
          <span className="font-black text-red-700">⚠️ {clashBatchIds.size} batch(es) have teacher clashes.</span>
          <span className="text-red-600 ml-1">Click a cell to override or regenerate after marking absences.</span>
        </div>
      )}

      {/* Empty state */}
      {schedule.length === 0 && (
        <div className="rounded-2xl p-16 text-center mb-6" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
          <div className="text-5xl mb-4">⚡</div>
          <div className="text-2xl font-black text-gray-900">No schedule for this week</div>
          <div className="text-gray-500 mt-2 mb-6">
            Click <strong>Generate Schedule</strong> above to auto-create a clash-free timetable
            based on this month&apos;s syllabus lag.
          </div>
          <div className="text-sm text-gray-400">
            💡 Tip: Mark teacher absences first, then generate for a clean schedule.
          </div>
        </div>
      )}

      {/* Lag info banner */}
      <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700 font-semibold">
        ⚡ Schedule is lag-aware — subjects behind the monthly plan automatically get priority slots this week.
        Click any cell to manually override. Amber ring = manual override.
      </div>

      <ScheduleGrid
        weekStart={weekStart}
        schedule={schedule}
        batches={batches}
        teachers={teachers}
        offDays={offDays}
        includeSunday={includeSunday}
        clashBatchIds={Array.from(clashBatchIds)}
      />
    </div>
  )
}
