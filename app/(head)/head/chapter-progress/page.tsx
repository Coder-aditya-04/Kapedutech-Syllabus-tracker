import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

interface PlanRow {
  batch_type: string
  class_level: string
  subject: string
  topic_name: string
  planned_lectures: number
}

interface LogRow {
  subject: string
  chapter_name: string
  lectures_this_week: number
  notes: string | null
  batches: { batch_type: string; class_level: string; name: string; centers: { name: string } } | null
  user_profiles: { name: string } | null
}

// Strip [PHY]/[CHE] prefix, lowercase, remove punctuation
function norm(s: string) {
  return s.replace(/^\[[^\]]*\]\s*/, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function matchPlan(
  chapterName: string,
  subject: string,
  batchType: string,
  classLevel: string,
  planMap: Map<string, number>,
): number {
  const normLog = norm(chapterName)
  let bestPartial = 0
  for (const [key, v] of Array.from(planMap)) {
    // key format: "batch_type|class_level|subject|topic_name"
    const parts = key.split('|')
    const pBatch = parts[0] ?? ''
    const pClass = parts[1] ?? ''
    const pSubj  = parts[2] ?? ''
    const pTopic = parts.slice(3).join('|') // topic_name may contain |
    if (pBatch !== batchType || pClass !== classLevel || pSubj !== subject) continue
    const normPlan = norm(pTopic)
    if (normPlan === normLog) return v
    if (normPlan.includes(normLog) || normLog.includes(normPlan)) bestPartial = v
  }
  return bestPartial
}

type Status = 'rushed' | 'over' | 'on_track' | 'no_plan' | 'in_progress'

const STATUS_STYLE: Record<Status, { bg: string; text: string; border: string; label: string; emoji: string }> = {
  rushed:      { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Rushed ✓Done',  emoji: '⚠️' },
  over:        { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Over ✓Done',    emoji: '🔵' },
  on_track:    { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Done ✓',        emoji: '✅' },
  in_progress: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'In Progress',   emoji: '🔄' },
  no_plan:     { bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   label: 'No Plan',       emoji: '⚪' },
}

interface ChapterRow {
  teacherName: string
  batchName: string
  centerName: string
  batchType: string
  classLevel: string
  subject: string
  chapterName: string
  planned: number
  done: number
  percent: number
  isComplete: boolean
  status: Status
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  Physics:     { bg: 'bg-blue-100',   text: 'text-blue-800'   },
  Chemistry:   { bg: 'bg-purple-100', text: 'text-purple-800' },
  Botany:      { bg: 'bg-green-100',  text: 'text-green-800'  },
  Zoology:     { bg: 'bg-teal-100',   text: 'text-teal-800'   },
  Mathematics: { bg: 'bg-orange-100', text: 'text-orange-800' },
}

export default async function ChapterProgressPage() {
  const supabase = await createClient()

  const [{ data: rawPlans }, { data: rawLogs }] = await Promise.all([
    supabase.from('lecture_plans').select('batch_type, class_level, subject, topic_name, planned_lectures'),
    supabase.from('weekly_logs')
      .select('subject, chapter_name, lectures_this_week, notes, batches(batch_type, class_level, name, centers(name)), user_profiles(name)')
      .eq('is_holiday', false),
  ])

  const plans = (rawPlans ?? []) as PlanRow[]
  const logs  = (rawLogs  ?? []) as unknown as LogRow[]

  // Build plan map keyed by pipe-separated fields
  const planMap = new Map<string, number>()
  for (const p of plans) {
    const key = [p.batch_type, p.class_level, p.subject, p.topic_name].join('|')
    planMap.set(key, (planMap.get(key) ?? 0) + p.planned_lectures)
  }

  // Aggregate logs: (teacher, batch, subject, chapter) → total done + completion flag
  const aggMap = new Map<string, {
    teacherName: string; batchName: string; centerName: string
    batchType: string; classLevel: string; subject: string; chapterName: string
    done: number; isComplete: boolean
  }>()

  for (const l of logs) {
    const batch   = l.batches
    const teacher = l.user_profiles
    if (!batch || !teacher) continue
    // Derive the plan's batch_type from batch name (same as planner/log form do)
    const batchBase = batch.name.replace(/\s*[–\-]\s*\d+.*$/, '').trim()
    const key = [teacher.name, batch.name, l.subject, l.chapter_name].join('|')
    if (!aggMap.has(key)) {
      aggMap.set(key, {
        teacherName: teacher.name,
        batchName:   batch.name,
        centerName:  batch.centers?.name ?? '',
        batchType:   batchBase,
        classLevel:  batch.class_level,
        subject:     l.subject,
        chapterName: l.chapter_name,
        done: 0,
        isComplete: false,
      })
    }
    const entry = aggMap.get(key)!
    entry.done += l.lectures_this_week
    if (l.notes?.includes('✅ Chapter completed.')) entry.isComplete = true
  }

  // Build result rows
  const rows: ChapterRow[] = []
  for (const [, agg] of Array.from(aggMap)) {
    const planned = matchPlan(agg.chapterName, agg.subject, agg.batchType, agg.classLevel, planMap)
    const percent = planned > 0 ? Math.round((agg.done / planned) * 100) : 0

    let status: Status
    if (planned === 0) {
      status = 'no_plan'
    } else if (!agg.isComplete) {
      // Chapter still in progress — never flag as rushed regardless of percentage
      status = 'in_progress'
    } else if (percent > 120) {
      status = 'over'
    } else if (percent < 75) {
      status = 'rushed'  // Only warn when teacher explicitly marked chapter as done
    } else {
      status = 'on_track'
    }

    rows.push({ ...agg, planned, percent, status })
  }

  // Sort: rushed first, then over, in_progress, on_track, no_plan
  const ORDER: Record<Status, number> = { rushed: 0, over: 1, in_progress: 2, on_track: 3, no_plan: 4 }
  rows.sort((a, b) => {
    const so = ORDER[a.status] - ORDER[b.status]
    return so !== 0 ? so : a.teacherName.localeCompare(b.teacherName)
  })

  const counts = { rushed: 0, over: 0, on_track: 0, in_progress: 0, no_plan: 0 }
  for (const r of rows) counts[r.status]++

  const byTeacher = new Map<string, ChapterRow[]>()
  for (const r of rows) {
    if (!byTeacher.has(r.teacherName)) byTeacher.set(r.teacherName, [])
    byTeacher.get(r.teacherName)!.push(r)
  }

  const warnings = rows.filter(r => r.status === 'rushed')

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">📚 Chapter Progress</h1>
        <p className="text-gray-500 text-base mt-1">
          Chapter-wise: total lectures logged vs allocated — flags chapters completed too quickly
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        {([
          { label: 'Chapters Tracked', value: rows.length,        style: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', textColor: 'text-violet-700', border: 'border-violet-100' },
          { label: '⚠️ Rushed',        value: counts.rushed,      style: 'linear-gradient(135deg,#fef2f2,#fee2e2)', textColor: 'text-red-700',    border: 'border-red-100'    },
          { label: '🔵 Over-planned',  value: counts.over,        style: 'linear-gradient(135deg,#fff7ed,#fed7aa)', textColor: 'text-orange-700', border: 'border-orange-100' },
          { label: '✅ On Track',      value: counts.on_track,    style: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', textColor: 'text-green-700',  border: 'border-green-100'  },
        ] as const).map(c => (
          <div key={c.label} className={`rounded-2xl border ${c.border} p-5 card-lift`} style={{ background: c.style }}>
            <div className={`text-3xl font-black ${c.textColor}`}>{c.value}</div>
            <div className="text-sm font-bold text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Explanation ── */}
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <span className="font-black">How this works: </span>
        Sums all weekly log entries per chapter regardless of which week they were logged.
        If a teacher logged Electrostatics across 5 weeks (total 20 lectures) but the plan allocates 36 —
        it shows <span className="font-black text-red-700">⚠️ Rushed</span> (under 75% of plan used).
        Chapters not yet in the Planner show as <span className="font-black">⚪ No Plan</span>.
      </div>

      {/* ── Warnings block ── */}
      {warnings.length > 0 && (
        <div className="mb-8 rounded-2xl border border-red-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg,#fef2f2,#fee2e2)' }}>
            <span className="text-xl">⚠️</span>
            <h2 className="font-black text-red-800 text-lg">Chapters Finished Too Quickly — Review Required</h2>
            <span className="ml-auto text-xs font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
              {warnings.length} chapters
            </span>
          </div>
          <div className="divide-y divide-red-50">
            {warnings.map((r, i) => {
              const sc = SUBJECT_COLORS[r.subject] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
              const displayName = r.chapterName.replace(/^\[[^\]]*\]\s*/, '')
              return (
                <div key={i} className="px-6 py-4 bg-white hover:bg-red-50/40 transition-colors">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-900">{displayName}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{r.teacherName} · {r.batchName} · {r.centerName}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{r.subject}</span>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-red-700">{r.done} done / {r.planned} planned</div>
                      <div className="text-xs text-red-500 font-semibold">Only {r.percent}% of allocation used</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-red-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(r.percent, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Per-teacher tables ── */}
      <div className="space-y-6">
        {Array.from(byTeacher).map(([teacher, teacherRows]) => {
          const hasWarning = teacherRows.some(r => r.status === 'rushed')
          return (
            <div key={teacher} className={`rounded-2xl border overflow-hidden shadow-sm ${hasWarning ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="px-6 py-4 border-b flex items-center gap-3"
                style={{ background: hasWarning ? 'linear-gradient(135deg,#fff5f5,#fef2f2)' : 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                  style={{ background: hasWarning ? '#ef4444' : 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}>
                  {teacher.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className={`font-black text-base ${hasWarning ? 'text-red-900' : 'text-gray-900'}`}>{teacher}</h3>
                  <p className="text-xs text-gray-500">{teacherRows.length} chapters tracked</p>
                </div>
                {hasWarning && (
                  <span className="ml-auto text-xs font-black text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
                    ⚠️ {teacherRows.filter(r => r.status === 'rushed').length} rushed
                  </span>
                )}
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Chapter</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Batch</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Planned</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Done</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide min-w-[160px]">Progress</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherRows.map((r, i) => {
                      const st  = STATUS_STYLE[r.status]
                      const sc  = SUBJECT_COLORS[r.subject] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
                      const barW = r.planned > 0 ? Math.min(Math.round((r.done / r.planned) * 100), 100) : 0
                      const barColor =
                        r.status === 'rushed'      ? '#ef4444' :
                        r.status === 'over'        ? '#f97316' :
                        r.status === 'on_track'    ? '#22c55e' : '#3b82f6'
                      const displayName = r.chapterName.replace(/^\[[^\]]*\]\s*/, '')
                      return (
                        <tr key={i} className={`border-b border-gray-50 last:border-0 transition-colors ${r.status === 'rushed' ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50/60'}`}>
                          <td className="px-5 py-3.5 font-bold text-gray-900 max-w-[200px]">{displayName}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{r.subject}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-gray-700 text-sm">{r.batchName}</div>
                            <div className="text-xs text-gray-400">{r.centerName}</div>
                          </td>
                          <td className="px-5 py-3.5 text-center font-black text-gray-700">
                            {r.planned > 0 ? r.planned : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-center font-black text-gray-900 text-base">{r.done}</td>
                          <td className="px-5 py-3.5">
                            {r.planned > 0 ? (
                              <div className="space-y-1">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-36">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: barColor }} />
                                </div>
                                <div className="text-xs font-semibold" style={{ color: barColor }}>{r.percent}%</div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">not in planner</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                              {st.emoji} {st.label}
                            </span>
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

      {rows.length === 0 && (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
          <div className="text-5xl mb-4">📚</div>
          <div className="text-2xl font-black text-gray-900">No data yet</div>
          <div className="text-gray-500 mt-2">
            Chapter logs will appear here once teachers submit weekly logs
          </div>
        </div>
      )}
    </div>
  )
}
