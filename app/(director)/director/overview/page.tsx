import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PaceStatus } from '@/lib/supabase/types'

export const revalidate = 60

export default async function DirectorOverviewPage() {
  const supabase = await createClient()
  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  interface BatchRow { id: string; name: string; batch_type: string; class_level: string; center_id: string; centers: { name: string } }
  interface LogRow { batch_id: string; subject: string; lectures_this_week: number; teacher_id: string; week_number: number }
  interface TeacherRow { id: string; name: string; center_id: string | null }
  interface CenterRow { id: string; name: string }

  const [batchRes, logRes, teacherRes, centerRes] = await Promise.all([
    supabase.from('batches').select('id, name, batch_type, class_level, center_id, centers(name)').eq('is_active', true),
    supabase.from('weekly_logs').select('batch_id, subject, lectures_this_week, teacher_id, week_number').eq('is_holiday', false).gte('submitted_at', monthStart).lte('submitted_at', monthEnd),
    supabase.from('user_profiles').select('id, name, center_id').eq('role', 'teacher'),
    supabase.from('centers').select('id, name'),
  ])
  const batches = batchRes.data as BatchRow[] | null
  const logsRaw = logRes.data as LogRow[] | null
  const teachers = teacherRes.data as TeacherRow[] | null
  const centers = centerRes.data as CenterRow[] | null

  const logMap: Record<string, number> = {}
  const weekLogs = new Map<string, Set<number>>()
  for (const log of (logsRaw ?? [])) {
    const key = `${log.batch_id}::${log.subject}`
    logMap[key] = (logMap[key] ?? 0) + log.lectures_this_week
    if (!weekLogs.has(log.teacher_id)) weekLogs.set(log.teacher_id, new Set())
    weekLogs.get(log.teacher_id)!.add(log.week_number)
  }

  const statusCounts: Record<string, Record<PaceStatus, number>> = {}
  for (const c of (centers ?? [])) {
    statusCounts[c.name] = { behind: 0, slow: 0, on_track: 0, fast: 0, no_entry: 0 }
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS  = ['Physics', 'Chemistry', 'Mathematics']

  for (const batch of (batches ?? [])) {
    const center = (batch.centers as { name: string }).name
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const pace = calculatePace(batchBase, subject, monthKey, actual)
      if (statusCounts[center]) statusCounts[center][pace.status]++
    }
  }

  const totalTeachers = teachers?.length ?? 0
  const activeTeachers = weekLogs.size
  const totalLogs = logsRaw?.length ?? 0
  const totalBatches = batches?.length ?? 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Director Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">All centers · {monthKey} {new Date().getFullYear()}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Batches', value: totalBatches, icon: '🏫', color: 'text-gray-900' },
          { label: 'Teachers', value: totalTeachers, icon: '👨‍🏫', color: 'text-gray-900' },
          { label: 'Active This Month', value: activeTeachers, icon: '✅', color: 'text-green-700' },
          { label: 'Logs This Month', value: totalLogs, icon: '📋', color: 'text-blue-700' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <div className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{kpi.icon} {kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Center breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {(centers ?? []).map(center => {
          const counts = statusCounts[center.name] ?? { behind: 0, slow: 0, on_track: 0, fast: 0, no_entry: 0 }
          const centerTeachers = teachers?.filter(t => t.center_id === center.id) ?? []
          const centerActive = centerTeachers.filter(t => weekLogs.has(t.id)).length

          return (
            <Card key={center.id}>
              <CardHeader className="pb-3">
                <CenterBadge name={center.name} />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'On Track', count: counts.on_track, color: 'text-green-700', bg: 'bg-green-50', emoji: '🟢' },
                    { label: 'Behind',   count: counts.behind,   color: 'text-red-700',   bg: 'bg-red-50',   emoji: '🔴' },
                    { label: 'No Entry', count: counts.no_entry, color: 'text-gray-600',  bg: 'bg-gray-50',  emoji: '⚪' },
                    { label: 'Too Fast', count: counts.fast,     color: 'text-blue-700',  bg: 'bg-blue-50',  emoji: '🔵' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-lg p-3`}>
                      <div className={`text-xl font-black ${s.color}`}>{s.count}</div>
                      <div className={`text-xs font-semibold ${s.color}`}>{s.emoji} {s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500">
                  {centerActive}/{centerTeachers.length} teachers active this month
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Full pace table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">All Batches — {monthKey} Pace</CardTitle>
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
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Plan</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {(batches ?? []).flatMap(batch => {
                  const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
                  return subjects.map(subject => {
                    const actual = logMap[`${batch.id}::${subject}`] ?? 0
                    const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
                    const pace = calculatePace(batchBase, subject, monthKey, actual)
                    return (
                      <tr key={`${batch.id}-${subject}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2.5"><CenterBadge name={(batch.centers as { name: string }).name} /></td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-xs">{batch.name}</div>
                          <BatchTypeBadge type={batch.batch_type} />
                        </td>
                        <td className="px-4 py-2.5"><SubjectBadge subject={subject} /></td>
                        <td className="px-4 py-2.5 text-center font-bold">{actual}</td>
                        <td className="px-4 py-2.5 text-center text-gray-500">{pace.planned}</td>
                        <td className="px-4 py-2.5"><PaceStatusBadge status={pace.status} showPercent percent={pace.percent} /></td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
