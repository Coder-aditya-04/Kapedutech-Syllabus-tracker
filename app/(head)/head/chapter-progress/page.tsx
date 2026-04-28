import { createClient } from '@/lib/supabase/server'
import { CenterBadge } from '@/components/shared/CenterBadge'
import Link from 'next/link'

export const revalidate = 0

// ── Types ──────────────────────────────────────────────────────────────────
interface PlanRow {
  batch_type: string; class_level: string; subject: string
  topic_name: string; planned_lectures: number; month_name: string
}
interface LogRow {
  subject: string; chapter_name: string; lectures_this_week: number
  submitted_at: string; notes: string | null
  batches: { name: string; batch_type: string; class_level: string; centers: { name: string } } | null
}
interface BatchRow {
  id: string; name: string; batch_type: string; class_level: string; is_active: boolean
  centers: { name: string }
}

type ChapStatus = 'completed' | 'in_progress' | 'not_started'

interface ChapSummary {
  topicName: string; subject: string; monthName: string
  planned: number; done: number; status: ChapStatus; completedMonth: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
function norm(s: string) {
  return s.replace(/^\[[^\]]*\]\s*/, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}


const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-100 text-blue-800', Chemistry: 'bg-purple-100 text-purple-800',
  Botany: 'bg-green-100 text-green-800', Zoology: 'bg-teal-100 text-teal-800',
  Mathematics: 'bg-orange-100 text-orange-800',
}

const STATUS_CONFIG: Record<ChapStatus, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  completed:   { label: 'Completed',   emoji: '✅', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  in_progress: { label: 'In Progress', emoji: '🔄', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  not_started: { label: 'Not Started', emoji: '⏳', bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200'  },
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function ChapterProgressPage({
  searchParams,
}: {
  searchParams: { batch?: string }
}) {
  const supabase = await createClient()

  const [{ data: rawPlans }, { data: rawLogs }, { data: rawBatches }] = await Promise.all([
    supabase.from('lecture_plans').select('batch_type, class_level, subject, topic_name, planned_lectures, month_name'),
    supabase.from('weekly_logs')
      .select('subject, chapter_name, lectures_this_week, submitted_at, notes, batches(name, batch_type, class_level, centers(name))')
      .eq('is_holiday', false),
    supabase.from('batches').select('id, name, batch_type, class_level, is_active, centers(name)').eq('is_active', true).order('name'),
  ])

  const plans   = (rawPlans   ?? []) as PlanRow[]
  const logs    = (rawLogs    ?? []) as unknown as LogRow[]
  const batches = (rawBatches ?? []) as unknown as BatchRow[]

  // Group batches by batch_type for the tab list
  const batchTypeSet = new Set(plans.map(p => p.batch_type))
  const batchTabs = Array.from(batchTypeSet).sort()
  const selectedBatchType = searchParams.batch ?? batchTabs[0] ?? ''

  // Build log aggregation: key = "subject||normTopic" for the selected batch_type
  const logAgg = new Map<string, { done: number; isComplete: boolean; lastMonth: string | null }>()

  for (const log of logs) {
    const batch = log.batches
    if (!batch) continue
    const batchBase = batch.name.replace(/\s*[–\-]\s*\d+.*$/, '').trim()
    if (batchBase !== selectedBatchType) continue

    const normChap = norm(log.chapter_name)
    const key = `${log.subject}||${normChap}`
    const existing = logAgg.get(key) ?? { done: 0, isComplete: false, lastMonth: null }
    existing.done += log.lectures_this_week
    if (log.notes?.includes('✅ Chapter completed.')) existing.isComplete = true
    const month = new Date(log.submitted_at).toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    if (!existing.lastMonth) existing.lastMonth = month
    logAgg.set(key, existing)
  }

  // Build chapter summaries from lecture_plans for selected batch_type
  const chapMap = new Map<string, { planned: number; monthName: string }>()
  for (const p of plans) {
    if (p.batch_type !== selectedBatchType) continue
    const key = `${p.subject}||${norm(p.topic_name)}`
    const ex = chapMap.get(key)
    if (ex) { ex.planned += p.planned_lectures }
    else { chapMap.set(key, { planned: p.planned_lectures, monthName: p.month_name }) }
  }

  const chapters: ChapSummary[] = []
  for (const [key, { planned, monthName }] of Array.from(chapMap)) {
    const [subject, normTopic] = key.split('||')
    const topicName = plans.find(p => p.batch_type === selectedBatchType && norm(p.topic_name) === normTopic && p.subject === subject)?.topic_name ?? normTopic ?? ''
    const agg = logAgg.get(key) ?? { done: 0, isComplete: false, lastMonth: null }

    let status: ChapStatus
    if (agg.isComplete || agg.done >= planned) status = 'completed'
    else if (agg.done > 0) status = 'in_progress'
    else status = 'not_started'

    chapters.push({
      topicName: topicName.replace(/^\[[^\]]*\]\s*/, ''),
      subject: subject ?? '',
      monthName,
      planned,
      done: agg.done,
      status,
      completedMonth: agg.isComplete ? agg.lastMonth : null,
    })
  }

  // Sort: in_progress first, then not_started, then completed
  const ORDER: Record<ChapStatus, number> = { in_progress: 0, not_started: 1, completed: 2 }
  chapters.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.subject.localeCompare(b.subject))

  const counts = { completed: 0, in_progress: 0, not_started: 0 }
  for (const c of chapters) counts[c.status]++

  // Also build per-subject grouping
  const bySubject = new Map<string, ChapSummary[]>()
  for (const c of chapters) {
    if (!bySubject.has(c.subject)) bySubject.set(c.subject, [])
    bySubject.get(c.subject)!.push(c)
  }

  // Batches of the selected type
  const matchingBatches = batches.filter(b => b.name.replace(/\s*[–\-]\s*\d+.*$/, '').trim() === selectedBatchType)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">📚 Chapter Progress</h1>
        <p className="text-gray-500 text-base mt-1">Which chapters are done, in progress, or not yet started — per batch type</p>
      </div>

      {/* Batch type tabs */}
      {batchTabs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {batchTabs.map(bt => {
            const active = bt === selectedBatchType
            return (
              <Link key={bt} href={`/head/chapter-progress?batch=${encodeURIComponent(bt)}`}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  active ? 'text-white border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
                }`}
                style={active ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
                {bt}
              </Link>
            )
          })}
        </div>
      )}

      {/* Matching batches */}
      {matchingBatches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Batches:</span>
          {matchingBatches.map(b => (
            <span key={b.id} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600">
              {b.name}
              <span className="text-gray-300">·</span>
              <CenterBadge name={b.centers.name} />
            </span>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {([
          { status: 'completed'   as ChapStatus, label: 'Completed',   color: '#16a34a', grad: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: 'rgba(74,222,128,0.4)' },
          { status: 'in_progress' as ChapStatus, label: 'In Progress', color: '#2563eb', grad: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: 'rgba(96,165,250,0.4)' },
          { status: 'not_started' as ChapStatus, label: 'Not Started', color: '#6b7280', grad: 'linear-gradient(135deg,#f9fafb,#f3f4f6)', border: 'rgba(156,163,175,0.4)' },
        ]).map(s => (
          <div key={s.status} className="rounded-2xl p-5 card-lift" style={{ background: s.grad, border: `1.5px solid ${s.border}` }}>
            <div className="text-4xl font-black mb-1" style={{ color: s.color }}>{counts[s.status]}</div>
            <div className="text-sm font-bold text-gray-600">{STATUS_CONFIG[s.status].emoji} {s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">of {chapters.length} total chapters</div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {chapters.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8">
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
            const sc = SUBJECT_COLORS[subject] ?? 'bg-gray-100 text-gray-700'
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
                        <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Planned Month</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Planned</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Done</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide min-w-[140px]">Progress</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Completed In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chaps.map((c, i) => {
                        const st = STATUS_CONFIG[c.status]
                        const pct = c.planned > 0 ? Math.min(Math.round((c.done / c.planned) * 100), 100) : 0
                        const barColor = c.status === 'completed' ? '#22c55e' : c.status === 'in_progress' ? '#3b82f6' : '#e5e7eb'
                        return (
                          <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors
                            ${c.status === 'completed' ? 'bg-green-50/30 hover:bg-green-50/60' :
                              c.status === 'in_progress' ? 'bg-blue-50/30 hover:bg-blue-50/60' :
                              'hover:bg-gray-50/60'}`}>
                            <td className="px-5 py-3.5 font-bold text-gray-900 max-w-[220px]">{c.topicName}</td>
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
