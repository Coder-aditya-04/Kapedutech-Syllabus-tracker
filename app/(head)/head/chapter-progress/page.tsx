import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import Link from 'next/link'

export const revalidate = 0

// ── Types ──────────────────────────────────────────────────────────────────
interface PlanRow {
  batch_type: string; class_level: string; subject: string
  topic_name: string; planned_lectures: number; month_name: string
}
interface LogRow {
  teacher_id: string; subject: string; chapter_name: string
  lectures_this_week: number; submitted_at: string; notes: string | null
  batches: { id: string; name: string; batch_type: string; class_level: string; center_id: string; centers: { name: string } } | null
  user_profiles: { id: string; name: string; employee_id: string | null } | null
}
interface BatchRow {
  id: string; name: string; batch_type: string; class_level: string; center_id: string
  centers: { name: string }
  teacher_batch_assignments: Array<{
    subject: string; is_active: boolean
    user_profiles: { id: string; name: string; employee_id: string | null } | null
  }>
}
interface CenterRow { id: string; name: string }

type ChapStatus = 'completed' | 'in_progress' | 'not_started'

// ── Helpers ────────────────────────────────────────────────────────────────
function norm(s: string) {
  return s.replace(/^\[[^\]]*\]\s*/, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}
// batches table stores "JEE_EXCEL", lecture_plans stores "JEE Excel" — normalise both
function normBT(s: string) { return s.toLowerCase().replace(/[_\s]/g, '') }

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-100 text-blue-800', Chemistry: 'bg-purple-100 text-purple-800',
  Botany: 'bg-green-100 text-green-800', Zoology: 'bg-teal-100 text-teal-800',
  Mathematics: 'bg-orange-100 text-orange-800', Maths: 'bg-orange-100 text-orange-800',
}

const STATUS_CONFIG: Record<ChapStatus, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  completed:   { label: 'Completed',   emoji: '✅', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  in_progress: { label: 'In Progress', emoji: '🔄', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  not_started: { label: 'Not Started', emoji: '⏳', bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200'   },
}

// ── Page ───────────────────────────────────────────────────────────────────
interface SearchParams { view?: string; batch?: string; center?: string; batchId?: string }
interface Props { searchParams: SearchParams }

export default async function ChapterProgressPage({ searchParams }: Props) {
  const view = searchParams.view === 'teacher' ? 'teacher' : 'plan'

  const supabase = await createClient()
  const admin    = createAdminClient()

  const [{ data: rawPlans }, { data: rawLogs }, { data: rawBatches }, { data: rawCenters }] = await Promise.all([
    supabase.from('lecture_plans').select('batch_type, class_level, subject, topic_name, planned_lectures, month_name'),
    admin.from('weekly_logs')
      .select('teacher_id, subject, chapter_name, lectures_this_week, submitted_at, notes, batches(id, name, batch_type, class_level, center_id, centers(name)), user_profiles(id, name, employee_id)')
      .eq('is_holiday', false),
    admin.from('batches')
      .select('id, name, batch_type, class_level, center_id, centers(name), teacher_batch_assignments(subject, is_active, user_profiles(id, name, employee_id))')
      .eq('is_active', true).order('name'),
    supabase.from('centers').select('id, name').order('name'),
  ])

  const plans   = (rawPlans   ?? []) as PlanRow[]
  const logs    = (rawLogs    ?? []) as unknown as LogRow[]
  const batches = (rawBatches ?? []) as unknown as BatchRow[]
  const centers = (rawCenters ?? []) as CenterRow[]

  // ────────────────────────────────────────────────────────────────────────
  // VIEW TOGGLE HEADER (shared)
  // ────────────────────────────────────────────────────────────────────────
  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">📚 Chapter Progress</h1>
        <p className="text-gray-500 text-base mt-1">
          {view === 'plan' ? 'Plan vs actual lectures per chapter — per batch type' : 'Teacher-wise chapter completion per batch'}
        </p>
      </div>
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
        <Link href="/head/chapter-progress?view=plan"
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'plan' ? 'bg-white shadow text-violet-700' : 'text-gray-500 hover:text-gray-700'}`}>
          📊 Plan vs Actual
        </Link>
        <Link href="/head/chapter-progress?view=teacher"
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'teacher' ? 'bg-white shadow text-violet-700' : 'text-gray-500 hover:text-gray-700'}`}>
          👨‍🏫 Teacher-wise
        </Link>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════
  // VIEW 1: PLAN VS ACTUAL
  // ════════════════════════════════════════════════════════════════════════
  if (view === 'plan') {
    const batchTypeSet = new Set(plans.map(p => p.batch_type))
    const batchTabs    = Array.from(batchTypeSet).sort()
    const selectedBT   = searchParams.batch ?? batchTabs[0] ?? ''

    // Aggregate logs for selected batch_type (normalise both sides: "JEE_EXCEL" ↔ "JEE Excel")
    const logAgg = new Map<string, { done: number; isComplete: boolean; lastMonth: string | null; teachers: Set<string> }>()
    for (const log of logs) {
      const b = log.batches
      if (!b) continue
      if (normBT(b.batch_type) !== normBT(selectedBT)) continue
      const key = `${log.subject}||${norm(log.chapter_name)}`
      const ex  = logAgg.get(key) ?? { done: 0, isComplete: false, lastMonth: null, teachers: new Set<string>() }
      ex.done += log.lectures_this_week
      if (log.notes?.includes('✅ Chapter completed.')) ex.isComplete = true
      if (log.user_profiles?.name) ex.teachers.add(log.user_profiles.name)
      const month = new Date(log.submitted_at).toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
      if (!ex.lastMonth) ex.lastMonth = month
      logAgg.set(key, ex)
    }

    // Build chapter list from lecture_plans
    const chapMap = new Map<string, { planned: number; monthName: string }>()
    for (const p of plans) {
      if (p.batch_type !== selectedBT) continue
      const key = `${p.subject}||${norm(p.topic_name)}`
      const ex  = chapMap.get(key)
      if (ex) ex.planned += p.planned_lectures
      else chapMap.set(key, { planned: p.planned_lectures, monthName: p.month_name })
    }

    const chapters = Array.from(chapMap).map(([key, { planned, monthName }]) => {
      const [subject, normTopic] = key.split('||')
      const topicName = plans.find(p => p.batch_type === selectedBT && norm(p.topic_name) === normTopic && p.subject === subject)?.topic_name ?? normTopic ?? ''
      const agg = logAgg.get(key) ?? { done: 0, isComplete: false, lastMonth: null, teachers: new Set<string>() }
      let status: ChapStatus
      if (agg.isComplete || agg.done >= planned) status = 'completed'
      else if (agg.done > 0) status = 'in_progress'
      else status = 'not_started'
      return { topicName: topicName.replace(/^\[[^\]]*\]\s*/, ''), subject: subject ?? '', monthName, planned, done: agg.done, status, completedMonth: agg.isComplete ? agg.lastMonth : null, teachers: Array.from(agg.teachers) }
    })

    const ORDER: Record<ChapStatus, number> = { in_progress: 0, not_started: 1, completed: 2 }
    chapters.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.subject.localeCompare(b.subject))

    const counts = { completed: 0, in_progress: 0, not_started: 0 }
    for (const c of chapters) counts[c.status]++

    const bySubject = new Map<string, typeof chapters>()
    for (const c of chapters) {
      if (!bySubject.has(c.subject)) bySubject.set(c.subject, [])
      bySubject.get(c.subject)!.push(c)
    }

    const matchingBatches = batches.filter(b => b.batch_type === selectedBT)

    return (
      <div>
        {header}

        {/* Batch type tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {batchTabs.map(bt => {
            const active = bt === selectedBT
            return (
              <Link key={bt} href={`/head/chapter-progress?view=plan&batch=${encodeURIComponent(bt)}`}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${active ? 'text-white border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}
                style={active ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
                {bt}
              </Link>
            )
          })}
        </div>

        {/* Matching batches */}
        {matchingBatches.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Batches:</span>
            {matchingBatches.map(b => (
              <span key={b.id} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600">
                {b.name} <span className="text-gray-300">·</span> <CenterBadge name={b.centers.name} />
              </span>
            ))}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {([
            { status: 'completed'   as ChapStatus, color: '#16a34a', grad: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: 'rgba(74,222,128,0.4)' },
            { status: 'in_progress' as ChapStatus, color: '#2563eb', grad: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: 'rgba(96,165,250,0.4)' },
            { status: 'not_started' as ChapStatus, color: '#6b7280', grad: 'linear-gradient(135deg,#f9fafb,#f3f4f6)', border: 'rgba(156,163,175,0.4)' },
          ]).map(s => (
            <div key={s.status} className="rounded-2xl p-5 card-lift" style={{ background: s.grad, border: `1.5px solid ${s.border}` }}>
              <div className="text-4xl font-black mb-1" style={{ color: s.color }}>{counts[s.status]}</div>
              <div className="text-sm font-bold text-gray-600">{STATUS_CONFIG[s.status].emoji} {STATUS_CONFIG[s.status].label}</div>
              <div className="text-xs text-gray-400 mt-0.5">of {chapters.length} total chapters</div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        {chapters.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-black text-gray-700">Overall Completion</span>
              <span className="text-sm font-black text-violet-600">
                {counts.completed}/{chapters.length} chapters ({Math.round((counts.completed / chapters.length) * 100)}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(counts.completed / chapters.length) * 100}%` }} />
              <div className="h-full bg-blue-400 transition-all" style={{ width: `${(counts.in_progress / chapters.length) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs font-semibold text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Completed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />In Progress</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Not Started</span>
            </div>
          </div>
        )}

        {/* Chapter table grouped by subject */}
        {bySubject.size === 0 ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
            <div className="text-5xl mb-4">📚</div>
            <div className="text-2xl font-black text-gray-900">No chapters in planner</div>
            <div className="text-gray-500 mt-2">Add chapters to the Planner first, then track progress here</div>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(bySubject).map(([subject, chaps]) => {
              const sc   = SUBJECT_COLORS[subject] ?? 'bg-gray-100 text-gray-700'
              const done = chaps.filter(c => c.status === 'completed').length
              return (
                <div key={subject} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc}`}>{subject}</span>
                      <span className="font-black text-gray-900">{chaps.length} chapters</span>
                    </div>
                    <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      {done}/{chaps.length} done
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/40 border-b border-gray-100 text-left">
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Chapter / Topic</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Teacher</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Month</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Planned</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Done</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide min-w-[140px]">Progress</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Completed In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chaps.map((c, i) => {
                          const st  = STATUS_CONFIG[c.status]
                          const pct = c.planned > 0 ? Math.min(Math.round((c.done / c.planned) * 100), 100) : 0
                          const barColor = c.status === 'completed' ? '#22c55e' : c.status === 'in_progress' ? '#3b82f6' : '#e5e7eb'
                          return (
                            <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors
                              ${c.status === 'completed' ? 'bg-green-50/30 hover:bg-green-50/60' :
                                c.status === 'in_progress' ? 'bg-blue-50/30 hover:bg-blue-50/60' :
                                'hover:bg-gray-50/60'}`}>
                              <td className="px-5 py-3.5 font-bold text-gray-900 max-w-[220px]">{c.topicName}</td>
                              <td className="px-5 py-3.5">
                                {c.teachers.length === 0
                                  ? <span className="text-gray-300 text-xs">—</span>
                                  : <div className="flex flex-col gap-0.5">
                                      {c.teachers.map((t, ti) => (
                                        <span key={ti} className="text-xs font-semibold text-gray-700 whitespace-nowrap">{t}</span>
                                      ))}
                                    </div>
                                }
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-gray-500">{c.monthName}</td>
                              <td className="px-5 py-3.5 text-center font-black text-gray-700">{c.planned}</td>
                              <td className="px-5 py-3.5 text-center font-black text-gray-900 text-base">{c.done}</td>
                              <td className="px-5 py-3.5">
                                <div className="space-y-1">
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-28">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                                  </div>
                                  <div className="text-xs font-semibold text-gray-400">{pct}%</div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                                  {st.emoji} {st.label}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs font-semibold text-gray-500">
                                {c.completedMonth ?? <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // VIEW 2: TEACHER-WISE
  // ════════════════════════════════════════════════════════════════════════
  const selectedCenterId = searchParams.center ?? centers[0]?.id ?? ''
  const selectedBatchId  = searchParams.batchId ?? ''

  const centerBatches = batches.filter(b => b.center_id === selectedCenterId)
  const selectedBatch = centerBatches.find(b => b.id === selectedBatchId) ?? centerBatches[0] ?? null

  // Build teacher-wise chapter data for the selected batch
  interface TeacherProgress {
    teacherId: string; teacherName: string; employeeId: string | null; subject: string
    completed: string[]; inProgress: string[]; notStarted: string[]
    totalDone: number; totalPlanned: number
  }

  const teacherProgress: TeacherProgress[] = []

  if (selectedBatch) {
    const activeAssignments = selectedBatch.teacher_batch_assignments.filter(a => a.is_active && a.user_profiles)

    for (const assignment of activeAssignments) {
      const teacher = assignment.user_profiles!
      const subject = assignment.subject

      // Get all logs for this teacher + batch + subject
      const teacherLogs = logs.filter(l =>
        l.teacher_id === teacher.id &&
        l.batches?.id === selectedBatch.id &&
        l.subject === subject
      )

      // Get planned chapters for this batch_type + subject
      const plannedChapters = plans.filter(p =>
        p.batch_type === selectedBatch.batch_type &&
        p.subject === subject
      )

      // Aggregate by chapter
      const chapAgg = new Map<string, { done: number; isComplete: boolean }>()
      for (const log of teacherLogs) {
        const key = norm(log.chapter_name)
        const ex  = chapAgg.get(key) ?? { done: 0, isComplete: false }
        ex.done += log.lectures_this_week
        if (log.notes?.includes('✅ Chapter completed.')) ex.isComplete = true
        chapAgg.set(key, ex)
      }

      const completed: string[]  = []
      const inProgress: string[] = []
      const notStarted: string[] = []

      const seenKeys = new Set<string>()

      // First pass: chapters from logs
      for (const log of teacherLogs) {
        const key  = norm(log.chapter_name)
        if (seenKeys.has(key)) continue
        seenKeys.add(key)
        const agg  = chapAgg.get(key)!
        const plan = plannedChapters.find(p => norm(p.topic_name) === key)
        const displayName = log.chapter_name.replace(/^\[[^\]]*\]\s*/, '')
        if (agg.isComplete || (plan && agg.done >= plan.planned_lectures)) completed.push(displayName)
        else if (agg.done > 0) inProgress.push(displayName)
      }

      // Second pass: planned chapters not yet touched
      for (const p of plannedChapters) {
        const key = norm(p.topic_name)
        if (!seenKeys.has(key)) {
          notStarted.push(p.topic_name.replace(/^\[[^\]]*\]\s*/, ''))
          seenKeys.add(key)
        }
      }

      const totalPlanned = plannedChapters.reduce((s, p) => s + p.planned_lectures, 0)
      const totalDone    = teacherLogs.reduce((s, l) => s + l.lectures_this_week, 0)

      teacherProgress.push({
        teacherId: teacher.id, teacherName: teacher.name, employeeId: teacher.employee_id,
        subject, completed, inProgress, notStarted, totalDone, totalPlanned,
      })
    }

    teacherProgress.sort((a, b) => a.subject.localeCompare(b.subject) || a.teacherName.localeCompare(b.teacherName))
  }

  return (
    <div>
      {header}

      {/* Center selector */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Center</span>
        {centers.map(c => {
          const active = c.id === selectedCenterId
          return (
            <Link key={c.id}
              href={`/head/chapter-progress?view=teacher&center=${c.id}`}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${active ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}
              style={active ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
              {c.name}
            </Link>
          )
        })}
      </div>

      {/* Batch selector for selected center */}
      {centerBatches.length === 0 ? (
        <div className="text-sm text-gray-400 mb-6">No active batches at this center.</div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap mb-6 pb-4 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Batch</span>
          {centerBatches.map(b => {
            const active = b.id === (selectedBatch?.id ?? '')
            return (
              <Link key={b.id}
                href={`/head/chapter-progress?view=teacher&center=${selectedCenterId}&batchId=${b.id}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${active ? 'text-white border-transparent shadow' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}
                style={active ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
                {b.name}
              </Link>
            )
          })}
        </div>
      )}

      {/* Teacher table */}
      {!selectedBatch ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
          <div className="text-4xl mb-3">👨‍🏫</div>
          <div className="text-xl font-black text-gray-900">Select a batch above</div>
        </div>
      ) : teacherProgress.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-white border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-lg font-black text-gray-900">No teachers assigned to {selectedBatch.name}</div>
          <div className="text-gray-400 mt-1 text-sm">Assign teachers via the Teachers page first</div>
        </div>
      ) : (
        <div className="space-y-4">
          {teacherProgress.map(tp => {
            const sc  = SUBJECT_COLORS[tp.subject] ?? 'bg-gray-100 text-gray-700'
            const pct = tp.totalPlanned > 0 ? Math.min(Math.round((tp.totalDone / tp.totalPlanned) * 100), 100) : 0

            return (
              <div key={`${tp.teacherId}-${tp.subject}`} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Teacher header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap"
                  style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-sm"
                      style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}>
                      {tp.teacherName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{tp.teacherName}</span>
                        {tp.employeeId && <span className="text-xs text-gray-400 font-semibold">{tp.employeeId}</span>}
                      </div>
                      <SubjectBadge subject={tp.subject} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Mini stats */}
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">✅ {tp.completed.length} done</span>
                      <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">🔄 {tp.inProgress.length} ongoing</span>
                      <span className="text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">⏳ {tp.notStarted.length} pending</span>
                    </div>
                    {/* Lecture count */}
                    <div className="text-xs font-bold text-gray-500 hidden md:block">
                      {tp.totalDone} / {tp.totalPlanned} lectures
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-5 py-2 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-black text-gray-500 w-10 text-right">{pct}%</span>
                  </div>
                </div>

                {/* Chapter columns */}
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  {/* Completed */}
                  <div className="p-4">
                    <div className="text-xs font-black text-green-700 uppercase tracking-wide mb-3">
                      ✅ Completed ({tp.completed.length})
                    </div>
                    {tp.completed.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">None yet</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {tp.completed.map((ch, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-green-800">
                            <span className="mt-0.5 shrink-0">✅</span>
                            <span className="font-semibold leading-tight">{ch}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* In Progress */}
                  <div className="p-4">
                    <div className="text-xs font-black text-blue-700 uppercase tracking-wide mb-3">
                      🔄 In Progress ({tp.inProgress.length})
                    </div>
                    {tp.inProgress.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">None ongoing</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {tp.inProgress.map((ch, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-blue-800">
                            <span className="mt-0.5 shrink-0">🔄</span>
                            <span className="font-semibold leading-tight">{ch}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Not Started */}
                  <div className="p-4">
                    <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                      ⏳ Not Started ({tp.notStarted.length})
                    </div>
                    {tp.notStarted.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">All covered!</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {tp.notStarted.slice(0, 8).map((ch, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                            <span className="mt-0.5 shrink-0">⏳</span>
                            <span className="font-medium leading-tight">{ch}</span>
                          </li>
                        ))}
                        {tp.notStarted.length > 8 && (
                          <li className="text-xs text-gray-400 font-semibold ml-4">+{tp.notStarted.length - 8} more…</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Subject color bar */}
                <div className={`h-1 ${sc.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-300')}`} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
