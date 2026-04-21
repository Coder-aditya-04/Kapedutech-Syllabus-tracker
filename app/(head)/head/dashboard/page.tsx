import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { PaceStatus } from '@/lib/supabase/types'

export const revalidate = 60

interface BatchRow {
  id: string
  name: string
  batch_type: string
  class_level: string
  centers: { name: string }
}

export default async function HeadDashboardPage() {
  const supabase = await createClient()
  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])

  interface LogRaw { batch_id: string; subject: string; lectures_this_week: number }

  // Get all active batches
  const { data: batches } = await supabase
    .from('batches')
    .select('id, name, batch_type, class_level, centers(name)')
    .eq('is_active', true)
    .order('name') as { data: BatchRow[] | null }

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
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pace Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monthly progress vs plan · {monthKey} {new Date().getFullYear()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/head/alerts" className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors">
            ⚠️ {statusCounts.behind + statusCounts.slow} alerts
          </Link>
          <Link href="/head/logs" className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
            All logs
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'No Entry',    count: statusCounts.no_entry, color: 'text-gray-600', bg: 'bg-gray-50', emoji: '⚪' },
          { label: 'Behind',      count: statusCounts.behind,   color: 'text-red-700',  bg: 'bg-red-50',  emoji: '🔴' },
          { label: 'On Track',    count: statusCounts.on_track, color: 'text-green-700',bg: 'bg-green-50',emoji: '🟢' },
          { label: 'Too Fast',    count: statusCounts.fast,     color: 'text-blue-700', bg: 'bg-blue-50', emoji: '🔵' },
        ].map(s => (
          <Card key={s.label} className={`${s.bg} border-0`}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-black">{s.count}</div>
              <div className={`text-sm font-semibold ${s.color} mt-0.5`}>{s.emoji} {s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Missing submissions alert */}
      {missingCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
          <span className="text-2xl">📝</span>
          <div>
            <div className="font-bold text-yellow-800">{missingCount} teacher{missingCount > 1 ? 's' : ''} haven&apos;t submitted Week {currentWeek}</div>
            <Link href="/head/logs" className="text-yellow-700 text-sm underline">View who&apos;s missing →</Link>
          </div>
        </div>
      )}

      {/* Pace table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Batch × Subject Pace — {monthKey}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Center</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Batch</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Subject</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Actual</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Planned</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">%</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.batch.id}-${row.subject}`} className={`border-b ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}>
                    <td className="px-4 py-2.5">
                      <CenterBadge name={row.batch.centers.name} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-gray-900 text-xs">{row.batch.name}</div>
                      <div className="flex gap-1 mt-0.5">
                        <BatchTypeBadge type={row.batch.batch_type} />
                        <span className="text-[10px] text-gray-400 font-medium">Cl. {row.batch.class_level}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <SubjectBadge subject={row.subject} />
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-900">{row.actual}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{row.paceResult.planned}</td>
                    <td className="px-4 py-2.5 text-center">
                      {row.paceResult.planned > 0 ? (
                        <span className={`font-bold ${row.paceResult.status === 'behind' ? 'text-red-600' : row.paceResult.status === 'slow' ? 'text-yellow-600' : row.paceResult.status === 'fast' ? 'text-blue-600' : 'text-green-600'}`}>
                          {row.paceResult.percent}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <PaceStatusBadge status={row.paceResult.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
