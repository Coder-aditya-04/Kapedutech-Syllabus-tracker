import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS, PLAN } from '@/lib/pace'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PaceStatus } from '@/lib/supabase/types'

export const revalidate = 60

export default async function AnalyticsPage() {
  const supabase = await createClient()

  interface LogRow {
    id: string; subject: string; lectures_this_week: number; week_number: number
    is_holiday: boolean; submitted_at: string; batch_id: string; teacher_id: string
    user_profiles: { name: string } | null
    batches: { name: string; batch_type: string; centers: { name: string } } | null
  }
  interface BatchRow { id: string; name: string; batch_type: string; center_id: string; centers: { name: string } }
  interface TeacherRow { id: string; name: string; center_id: string | null }
  interface CenterRow { id: string; name: string }

  const [logRes, batchRes, teacherRes, centerRes] = await Promise.all([
    supabase
      .from('weekly_logs')
      .select('id, subject, lectures_this_week, week_number, is_holiday, submitted_at, batch_id, teacher_id, user_profiles(name), batches(name, batch_type, centers(name))')
      .order('submitted_at', { ascending: false })
      .limit(500),
    supabase.from('batches').select('id, name, batch_type, center_id, centers(name)').eq('is_active', true),
    supabase.from('user_profiles').select('id, name, center_id').eq('role', 'teacher'),
    supabase.from('centers').select('id, name'),
  ])

  const logs = logRes.data as LogRow[] | null
  const batches = batchRes.data as BatchRow[] | null
  const teachers = teacherRes.data as TeacherRow[] | null
  const centers = centerRes.data as CenterRow[] | null

  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  // --- Week-by-week submission counts ---
  const weekCounts: Record<number, number> = {}
  for (const log of (logs ?? [])) {
    if (!log.is_holiday) weekCounts[log.week_number] = (weekCounts[log.week_number] ?? 0) + 1
  }
  const weekEntries = Object.entries(weekCounts)
    .map(([w, c]) => ({ week: Number(w), count: c }))
    .sort((a, b) => a.week - b.week)
    .slice(-12)
  const maxWeekCount = Math.max(...weekEntries.map(e => e.count), 1)

  // --- Teacher leaderboard (this month) ---
  const thisMonthLogs = (logs ?? []).filter(l => l.submitted_at >= monthStart && l.submitted_at <= monthEnd && !l.is_holiday)
  const teacherCounts: Record<string, { name: string; center: string; count: number; subjects: Set<string> }> = {}
  for (const log of thisMonthLogs) {
    const name = log.user_profiles?.name ?? 'Unknown'
    const center = log.batches?.centers?.name ?? '—'
    if (!teacherCounts[log.teacher_id]) teacherCounts[log.teacher_id] = { name, center, count: 0, subjects: new Set() }
    teacherCounts[log.teacher_id].count += log.lectures_this_week
    teacherCounts[log.teacher_id].subjects.add(log.subject)
  }
  const leaderboard = Object.values(teacherCounts).sort((a, b) => b.count - a.count).slice(0, 10)
  const maxLec = Math.max(...leaderboard.map(t => t.count), 1)

  // --- Subject distribution this month ---
  const subjectTotals: Record<string, number> = {}
  for (const log of thisMonthLogs) {
    subjectTotals[log.subject] = (subjectTotals[log.subject] ?? 0) + log.lectures_this_week
  }
  const subjectEntries = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])
  const maxSubject = Math.max(...subjectEntries.map(e => e[1]), 1)

  // --- Overall pace summary across all batches ---
  const logMap: Record<string, number> = {}
  for (const log of thisMonthLogs) {
    const k = `${log.batch_id}::${log.subject}`
    logMap[k] = (logMap[k] ?? 0) + log.lectures_this_week
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']
  const statusCounts: Record<PaceStatus, number> = { behind: 0, slow: 0, on_track: 0, fast: 0, no_entry: 0 }
  const batchPaceRows: Array<{ batchName: string; center: string; subject: string; actual: number; planned: number; percent: number; status: PaceStatus }> = []

  for (const batch of (batches ?? [])) {
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const pace = calculatePace(batchBase, subject, monthKey, actual)
      statusCounts[pace.status]++
      batchPaceRows.push({ batchName: batch.name, center: (batch.centers as { name: string }).name, subject, actual, planned: pace.planned, percent: pace.percent, status: pace.status })
    }
  }

  const behindRows = batchPaceRows.filter(r => r.status === 'behind').sort((a, b) => a.percent - b.percent)
  const totalCombinations = batchPaceRows.length

  // --- Monthly plan coverage (how much of the plan has been covered across all batch types) ---
  const planCoverage: Array<{ batchType: string; subject: string; planned: number; actual: number }> = []
  for (const [batchType, subjects] of Object.entries(PLAN)) {
    for (const [subject, months] of Object.entries(subjects)) {
      const planned = months[monthKey] ?? 0
      if (planned === 0) continue
      const matchingBatches = (batches ?? []).filter(b => b.name.startsWith(batchType.split(' ')[0]))
      let actual = 0
      for (const b of matchingBatches) {
        actual += logMap[`${b.id}::${subject}`] ?? 0
      }
      planCoverage.push({ batchType, subject, planned: planned * matchingBatches.length, actual })
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Deep-dive stats across all centers · {monthKey} {new Date().getFullYear()}</p>
      </div>

      {/* Pace summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'On Track', count: statusCounts.on_track, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Behind',   count: statusCounts.behind,   color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200' },
          { label: 'Slow',     count: statusCounts.slow,     color: 'text-yellow-700',bg: 'bg-yellow-50',border: 'border-yellow-200' },
          { label: 'Too Fast', count: statusCounts.fast,     color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200' },
          { label: 'No Entry', count: statusCounts.no_entry, color: 'text-gray-500',  bg: 'bg-gray-50',  border: 'border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-4`}>
            <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
            <div className={`text-xs font-semibold ${s.color} mt-0.5`}>{s.label}</div>
            <div className="text-[10px] text-gray-400 mt-1">of {totalCombinations} slots</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Weekly submission trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submission Trend by Week</CardTitle>
            <p className="text-xs text-gray-500">Number of lecture logs submitted per academic week</p>
          </CardHeader>
          <CardContent>
            {weekEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-1.5">
                {weekEntries.map(({ week, count }) => (
                  <div key={week} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">Wk {week}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-5 rounded-full bg-purple-500 flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(4, (count / maxWeekCount) * 100)}%` }}
                      >
                        <span className="text-[10px] text-white font-bold">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lectures by Subject — {monthKey}</CardTitle>
            <p className="text-xs text-gray-500">Total lectures logged per subject this month</p>
          </CardHeader>
          <CardContent>
            {subjectEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No entries this month</p>
            ) : (
              <div className="space-y-2">
                {subjectEntries.map(([subject, total]) => (
                  <div key={subject} className="flex items-center gap-2">
                    <div className="w-24 flex-shrink-0"><SubjectBadge subject={subject} /></div>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-5 rounded-full bg-[#08BD80] flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(4, (total / maxSubject) * 100)}%` }}
                      >
                        <span className="text-[10px] text-white font-bold">{total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teacher leaderboard */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Teacher Leaderboard — {monthKey}</CardTitle>
          <p className="text-xs text-gray-500">Top 10 teachers by total lectures delivered this month</p>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboard.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No submissions this month yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-gray-600 w-8">#</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600">Teacher</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600">Center</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600">Subjects</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600">Lectures</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((t, i) => (
                  <tr key={t.name + i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-black text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-semibold">{t.name}</td>
                    <td className="px-4 py-2.5"><CenterBadge name={t.center} /></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{Array.from(t.subjects).join(', ')}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div className="bg-[#6929C4] h-2 rounded-full" style={{ width: `${(t.count / maxLec) * 100}%` }} />
                        </div>
                        <span className="font-black text-gray-900 text-sm">{t.count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Behind batches alert table */}
      {behindRows.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">🔴 Behind Batches — Needs Attention</CardTitle>
            <p className="text-xs text-gray-500">{behindRows.length} batch-subject combinations below 70% of plan</p>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-red-50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-red-700">Center</th>
                  <th className="px-4 py-2.5 font-semibold text-red-700">Batch</th>
                  <th className="px-4 py-2.5 font-semibold text-red-700">Subject</th>
                  <th className="px-4 py-2.5 font-semibold text-red-700 text-center">Actual</th>
                  <th className="px-4 py-2.5 font-semibold text-red-700 text-center">Plan</th>
                  <th className="px-4 py-2.5 font-semibold text-red-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {behindRows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-red-50/50">
                    <td className="px-4 py-2.5"><CenterBadge name={r.center} /></td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{r.batchName}</td>
                    <td className="px-4 py-2.5"><SubjectBadge subject={r.subject} /></td>
                    <td className="px-4 py-2.5 text-center font-bold text-red-700">{r.actual}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{r.planned}</td>
                    <td className="px-4 py-2.5"><PaceStatusBadge status={r.status} showPercent percent={r.percent} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Center stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {(centers ?? []).map(center => {
          const centerTeachers = (teachers ?? []).filter(t => t.center_id === center.id)
          const centerLogs = thisMonthLogs.filter(l => l.batches?.centers?.name === center.name)
          const totalLec = centerLogs.reduce((s, l) => s + l.lectures_this_week, 0)
          const activeTeacherIds = new Set(centerLogs.map(l => l.teacher_id))
          const centerRows = batchPaceRows.filter(r => r.center === center.name)
          const onTrack = centerRows.filter(r => r.status === 'on_track').length
          const behind = centerRows.filter(r => r.status === 'behind').length

          return (
            <Card key={center.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CenterBadge name={center.name} />
                  <span className="text-xs text-gray-400">{centerTeachers.length} teachers</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-black text-purple-700">{totalLec}</div>
                    <div className="text-[10px] text-purple-600 font-semibold">Total Lectures</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-black text-green-700">{onTrack}</div>
                    <div className="text-[10px] text-green-600 font-semibold">On Track</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-2xl font-black text-red-700">{behind}</div>
                    <div className="text-[10px] text-red-600 font-semibold">Behind</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  {activeTeacherIds.size}/{centerTeachers.length} teachers active · {centerLogs.length} log entries this month
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
