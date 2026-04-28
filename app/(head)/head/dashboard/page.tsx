import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { CenterFilter } from '@/components/shared/CenterFilter'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import Link from 'next/link'
import type { PaceStatus } from '@/lib/supabase/types'

export const revalidate = 0

interface BatchRow {
  id: string
  name: string
  batch_type: string
  class_level: string
  center_id: string
  centers: { name: string }
}

export default async function HeadDashboardPage({ searchParams }: { searchParams: { center?: string } }) {
  const supabase = await createClient()
  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])

  interface LogRaw { batch_id: string; subject: string; lectures_this_week: number }

  // Get all active batches (filter by center if selected)
  let batchQuery = supabase
    .from('batches')
    .select('id, name, batch_type, class_level, center_id, centers(name)')
    .eq('is_active', true)
    .order('name')
  if (searchParams.center) batchQuery = batchQuery.eq('center_id', searchParams.center)
  const { data: batches } = await batchQuery as { data: BatchRow[] | null }

  // Get this month's log aggregates
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  const { data: logsRaw } = await supabase
    .from('weekly_logs')
    .select('batch_id, subject, lectures_this_week')
    .eq('is_holiday', false)
    .gte('submitted_at', monthStart)
    .lte('submitted_at', monthEnd) as { data: LogRaw[] | null }

  // Aggregate by batch+subject
  const logMap: Record<string, number> = {}
  for (const log of (logsRaw ?? [])) {
    const key = `${log.batch_id}::${log.subject}`
    logMap[key] = (logMap[key] ?? 0) + log.lectures_this_week
  }

  // Count pace statuses for summary
  const statusCounts: Record<PaceStatus, number> = { behind: 0, slow: 0, on_track: 0, fast: 0, no_entry: 0 }

  // Build table rows
  const rows: Array<{
    batch: BatchRow
    subject: string
    actual: number
    paceResult: ReturnType<typeof calculatePace>
  }> = []

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']

  for (const batch of (batches ?? [])) {
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const paceResult = calculatePace(batchBase, subject, monthKey, actual)
      statusCounts[paceResult.status]++
      rows.push({ batch: batch as BatchRow, subject, actual, paceResult })
    }
  }

  // Get this week's submission status
  const { getAcademicWeek } = await import('@/lib/pace')
  const currentWeek = getAcademicWeek()
  const { data: thisWeekLogs } = await supabase
    .from('weekly_logs')
    .select('teacher_id')
    .eq('week_number', currentWeek) as { data: { teacher_id: string }[] | null }
  const submittedThisWeek = new Set(thisWeekLogs?.map(l => l.teacher_id) ?? [])

  const { data: allTeachers } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('role', 'teacher') as { data: { id: string; name: string }[] | null }
  const missingCount = (allTeachers?.length ?? 0) - submittedThisWeek.size

  return (
    <div>
      {/* Center filter */}
      <div className="mb-6"><CenterFilter /></div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">📊 Pace Overview</h1>
          <p className="text-gray-500 text-base mt-1">Monthly progress vs plan · <span className="font-semibold text-violet-600">{monthKey} {new Date().getFullYear()}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/head/alerts" className="text-sm px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)', color: '#b91c1c', border: '1px solid #fca5a5' }}>
            ⚠️ {statusCounts.behind + statusCounts.slow} alerts
          </Link>
          <Link href="/head/logs" className="text-sm px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all hover:scale-105">
            📋 All logs
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 stagger">
        {[
          { label: 'No Entry',  count: statusCounts.no_entry, emoji: '⚪',
            gradient: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
            border: 'rgba(148,163,184,0.3)', numColor: '#475569' },
          { label: 'Behind',    count: statusCounts.behind,   emoji: '🔴',
            gradient: 'linear-gradient(135deg,#fff1f2 0%,#ffe4e6 100%)',
            border: 'rgba(248,113,113,0.4)', numColor: '#dc2626' },
          { label: 'On Track',  count: statusCounts.on_track, emoji: '🟢',
            gradient: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
            border: 'rgba(74,222,128,0.4)', numColor: '#16a34a' },
          { label: 'Too Fast',  count: statusCounts.fast,     emoji: '🔵',
            gradient: 'linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)',
            border: 'rgba(96,165,250,0.4)', numColor: '#2563eb' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5 card-lift" style={{ background: s.gradient, border: `1.5px solid ${s.border}` }}>
            <div className="text-4xl font-black mb-1" style={{ color: s.numColor }}>{s.count}</div>
            <div className="text-sm font-bold text-gray-600">{s.emoji} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Missing submissions alert */}
      {missingCount > 0 && (
        <div className="flex items-center gap-4 p-5 rounded-2xl mb-8 card-lift"
          style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1.5px solid rgba(251,191,36,0.4)' }}>
          <div className="text-3xl">📝</div>
          <div className="flex-1">
            <div className="font-bold text-yellow-900 text-base">{missingCount} teacher{missingCount > 1 ? 's' : ''} haven&apos;t submitted Week {currentWeek}</div>
            <Link href="/head/logs" className="text-yellow-700 text-sm font-semibold underline">View who&apos;s missing →</Link>
          </div>
        </div>
      )}

      {/* Pace table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
          <h2 className="text-lg font-bold text-gray-900">Batch × Subject Pace — <span className="text-violet-600">{monthKey}</span></h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Center</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Batch</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Actual</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Planned</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">%</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.batch.id}-${row.subject}`} className={`border-b border-gray-50 transition-colors hover:bg-violet-50/40 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <td className="px-5 py-3">
                    <CenterBadge name={row.batch.centers.name} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-bold text-gray-900 text-sm">{row.batch.name}</div>
                    <div className="flex gap-1.5 mt-0.5">
                      <BatchTypeBadge type={row.batch.batch_type} />
                      <span className="text-[10px] text-gray-400 font-semibold">Cl. {row.batch.class_level}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <SubjectBadge subject={row.subject} />
                  </td>
                  <td className="px-5 py-3 text-center font-black text-gray-900 text-base">{row.actual}</td>
                  <td className="px-5 py-3 text-center text-gray-500 font-semibold">{row.paceResult.planned}</td>
                  <td className="px-5 py-3 text-center">
                    {row.paceResult.planned > 0 ? (
                      <span className={`font-black text-base ${row.paceResult.status === 'behind' ? 'text-red-600' : row.paceResult.status === 'slow' ? 'text-yellow-600' : row.paceResult.status === 'fast' ? 'text-blue-600' : 'text-green-600'}`}>
                        {row.paceResult.percent}%
                      </span>
                    ) : <span className="text-gray-300 font-semibold">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <PaceStatusBadge status={row.paceResult.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
