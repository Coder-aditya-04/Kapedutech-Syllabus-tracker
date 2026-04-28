import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import type { PaceStatus } from '@/lib/supabase/types'

export const revalidate = 0

export default async function AnalyticsPage() {
  const supabase = await createClient()

  interface LogRow {
    id: string; subject: string; lectures_this_week: number; week_number: number
    is_holiday: boolean; submitted_at: string; batch_id: string; teacher_id: string
    user_profiles: { name: string } | null
    batches: { name: string; batch_type: string; centers: { name: string } } | null
  }
  interface BatchRow   { id: string; name: string; batch_type: string; center_id: string; centers: { name: string } }
  interface TeacherRow { id: string; name: string; center_id: string | null }
  interface CenterRow  { id: string; name: string }

  const [logRes, batchRes, teacherRes, centerRes] = await Promise.all([
    supabase.from('weekly_logs')
      .select('id, subject, lectures_this_week, week_number, is_holiday, submitted_at, batch_id, teacher_id, user_profiles(name), batches(name, batch_type, centers(name))')
      .order('submitted_at', { ascending: false }).limit(500),
    supabase.from('batches').select('id, name, batch_type, center_id, centers(name)').eq('is_active', true),
    supabase.from('user_profiles').select('id, name, center_id').eq('role', 'teacher'),
    supabase.from('centers').select('id, name'),
  ])

  const logs     = logRes.data    as LogRow[]     | null
  const batches  = batchRes.data  as BatchRow[]   | null
  const teachers = teacherRes.data as TeacherRow[] | null
  const centers  = centerRes.data  as CenterRow[]  | null

  const monthKey  = getCurrentMonthKey()
  const monthIdx  = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd   = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  // Weekly submission trend
  const weekCounts: Record<number, number> = {}
  for (const log of (logs ?? [])) {
    if (!log.is_holiday) weekCounts[log.week_number] = (weekCounts[log.week_number] ?? 0) + 1
  }
  const weekEntries = Object.entries(weekCounts)
    .map(([w, c]) => ({ week: Number(w), count: c }))
    .sort((a, b) => a.week - b.week).slice(-12)
  const maxWeekCount = Math.max(...weekEntries.map(e => e.count), 1)

  // Teacher leaderboard this month
  const thisMonthLogs = (logs ?? []).filter(l => l.submitted_at >= monthStart && l.submitted_at <= monthEnd && !l.is_holiday)
  const teacherCounts: Record<string, { name: string; center: string; count: number; subjects: Set<string> }> = {}
  for (const log of thisMonthLogs) {
    const name   = log.user_profiles?.name ?? 'Unknown'
    const center = log.batches?.centers?.name ?? '—'
    if (!teacherCounts[log.teacher_id]) teacherCounts[log.teacher_id] = { name, center, count: 0, subjects: new Set() }
    teacherCounts[log.teacher_id].count += log.lectures_this_week
    teacherCounts[log.teacher_id].subjects.add(log.subject)
  }
  const leaderboard = Object.values(teacherCounts).sort((a, b) => b.count - a.count).slice(0, 10)
  const maxLec = Math.max(...leaderboard.map(t => t.count), 1)

  // Subject distribution
  const subjectTotals: Record<string, number> = {}
  for (const log of thisMonthLogs) subjectTotals[log.subject] = (subjectTotals[log.subject] ?? 0) + log.lectures_this_week
  const subjectEntries = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])
  const maxSubject = Math.max(...subjectEntries.map(e => e[1]), 1)

  // Pace summary
  const logMap: Record<string, number> = {}
  for (const log of thisMonthLogs) {
    const k = `${log.batch_id}::${log.subject}`
    logMap[k] = (logMap[k] ?? 0) + log.lectures_this_week
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS  = ['Physics', 'Chemistry', 'Mathematics']
  const statusCounts: Record<PaceStatus, number> = { behind: 0, slow: 0, on_track: 0, fast: 0, no_entry: 0 }
  const batchPaceRows: Array<{ batchName: string; center: string; subject: string; actual: number; planned: number; percent: number; status: PaceStatus }> = []

  for (const batch of (batches ?? [])) {
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual    = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const pace      = calculatePace(batchBase, subject, monthKey, actual)
      statusCounts[pace.status]++
      batchPaceRows.push({ batchName: batch.name, center: (batch.centers as { name: string }).name, subject, actual, planned: pace.planned, percent: pace.percent, status: pace.status })
    }
  }

  const behindRows       = batchPaceRows.filter(r => r.status === 'behind').sort((a, b) => a.percent - b.percent)
  const totalCombinations = batchPaceRows.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">📈 Analytics</h1>
        <p className="text-gray-500 text-base mt-1">Deep-dive stats across all centers · <span className="font-semibold text-violet-600">{monthKey} {new Date().getFullYear()}</span></p>
      </div>

      {/* Pace summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 stagger">
        {[
          { label: 'On Track', count: statusCounts.on_track, g: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', b: 'rgba(74,222,128,0.4)',  n: '#16a34a' },
          { label: 'Behind',   count: statusCounts.behind,   g: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', b: 'rgba(248,113,113,0.4)', n: '#dc2626' },
          { label: 'Slow',     count: statusCounts.slow,     g: 'linear-gradient(135deg,#fffbeb,#fef3c7)', b: 'rgba(251,191,36,0.4)',  n: '#d97706' },
          { label: 'Too Fast', count: statusCounts.fast,     g: 'linear-gradient(135deg,#eff6ff,#dbeafe)', b: 'rgba(96,165,250,0.4)',  n: '#2563eb' },
          { label: 'No Entry', count: statusCounts.no_entry, g: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', b: 'rgba(148,163,184,0.3)', n: '#475569' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 card-lift" style={{ background: s.g, border: `1.5px solid ${s.b}` }}>
            <div className="text-3xl font-black mb-1" style={{ color: s.n }}>{s.count}</div>
            <div className="text-xs font-bold text-gray-600">{s.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">of {totalCombinations}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Weekly submission trend */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-lift">
          <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
            <h2 className="text-base font-black text-gray-900">📊 Submission Trend by Week</h2>
            <p className="text-xs text-gray-500 mt-0.5">Lecture logs submitted per academic week</p>
          </div>
          <div className="p-6">
            {weekEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {weekEntries.map(({ week, count }) => (
                  <div key={week} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 w-12 flex-shrink-0">Wk {week}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-6 rounded-full flex items-center justify-end pr-2.5 transition-all"
                        style={{ width: `${Math.max(8, (count / maxWeekCount) * 100)}%`, background: 'linear-gradient(90deg,#7C3AED,#1A73E8)' }}
                      >
                        <span className="text-xs text-white font-black">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-lift">
          <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f0fdf4)' }}>
            <h2 className="text-base font-black text-gray-900">📚 Lectures by Subject — {monthKey}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Total lectures logged per subject this month</p>
          </div>
          <div className="p-6">
            {subjectEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No entries this month</p>
            ) : (
              <div className="space-y-2.5">
                {subjectEntries.map(([subject, total]) => (
                  <div key={subject} className="flex items-center gap-3">
                    <div className="w-24 flex-shrink-0"><SubjectBadge subject={subject} /></div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-6 rounded-full flex items-center justify-end pr-2.5"
                        style={{ width: `${Math.max(8, (total / maxSubject) * 100)}%`, background: 'linear-gradient(90deg,#43A047,#08BD80)' }}
                      >
                        <span className="text-xs text-white font-black">{total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Teacher leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6 card-lift">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
          <h2 className="text-base font-black text-gray-900">🏆 Teacher Leaderboard — {monthKey}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Top 10 by total lectures delivered this month</p>
        </div>
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-gray-400 font-semibold">No submissions this month yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/40 text-left">
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase w-10">#</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Teacher</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Center</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Subjects</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Lectures</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((t, i) => (
                  <tr key={t.name + i} className="border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-500' : 'text-gray-300'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">{t.name}</td>
                    <td className="px-5 py-3.5"><CenterBadge name={t.center} /></td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{Array.from(t.subjects).join(', ')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="h-2.5 rounded-full" style={{ width: `${(t.count / maxLec) * 100}%`, background: 'linear-gradient(90deg,#7C3AED,#1A73E8)' }} />
                        </div>
                        <span className="font-black text-gray-900">{t.count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Behind batches */}
      {behindRows.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1.5px solid rgba(248,113,113,0.3)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)' }}>
            <span className="text-xl">🔴</span>
            <div>
              <h2 className="text-base font-black text-red-800">Behind Batches — Needs Attention</h2>
              <p className="text-xs text-red-500">{behindRows.length} batch-subject combinations below 70% of plan</p>
            </div>
          </div>
          <div className="bg-white overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-50 bg-red-50/40 text-left">
                  <th className="px-5 py-3.5 text-xs font-bold text-red-600 uppercase">Center</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-red-600 uppercase">Batch</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-red-600 uppercase">Subject</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-red-600 uppercase text-center">Actual</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-red-600 uppercase text-center">Plan</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-red-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {behindRows.map((r, i) => (
                  <tr key={i} className="border-b border-red-50 hover:bg-red-50/30 transition-colors">
                    <td className="px-5 py-3"><CenterBadge name={r.center} /></td>
                    <td className="px-5 py-3 font-bold text-sm text-gray-700">{r.batchName}</td>
                    <td className="px-5 py-3"><SubjectBadge subject={r.subject} /></td>
                    <td className="px-5 py-3 text-center font-black text-red-700 text-base">{r.actual}</td>
                    <td className="px-5 py-3 text-center text-gray-500 font-semibold">{r.planned}</td>
                    <td className="px-5 py-3"><PaceStatusBadge status={r.status} showPercent percent={r.percent} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Center stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {(centers ?? []).map(center => {
          const centerTeachers    = (teachers ?? []).filter(t => t.center_id === center.id)
          const centerLogs        = thisMonthLogs.filter(l => l.batches?.centers?.name === center.name)
          const totalLec          = centerLogs.reduce((s, l) => s + l.lectures_this_week, 0)
          const activeTeacherIds  = new Set(centerLogs.map(l => l.teacher_id))
          const centerRows        = batchPaceRows.filter(r => r.center === center.name)
          const onTrack           = centerRows.filter(r => r.status === 'on_track').length
          const behind            = centerRows.filter(r => r.status === 'behind').length

          return (
            <div key={center.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-lift">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
                <CenterBadge name={center.name} />
                <span className="text-xs text-gray-500 font-bold">{centerTeachers.length} teachers</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid rgba(124,58,237,0.15)' }}>
                    <div className="text-2xl font-black text-violet-700">{totalLec}</div>
                    <div className="text-xs font-bold text-violet-500 mt-0.5">Lectures</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid rgba(74,222,128,0.3)' }}>
                    <div className="text-2xl font-black text-green-700">{onTrack}</div>
                    <div className="text-xs font-bold text-green-500 mt-0.5">On Track</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', border: '1px solid rgba(248,113,113,0.3)' }}>
                    <div className="text-2xl font-black text-red-700">{behind}</div>
                    <div className="text-xs font-bold text-red-500 mt-0.5">Behind</div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 font-semibold">
                  {activeTeacherIds.size}/{centerTeachers.length} teachers active · {centerLogs.length} logs this month
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
