import { createClient } from '@/lib/supabase/server'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { Card, CardContent } from '@/components/ui/card'
import { calculatePace, MONTHS } from '@/lib/pace'

export const revalidate = 30

export default async function AllLogsPage() {
  const supabase = await createClient()

  interface LogRow {
    id: string; subject: string; chapter_name: string; lectures_this_week: number
    week_number: number; is_holiday: boolean; notes: string | null; submitted_at: string
    user_profiles: { name: string; employee_id: string | null } | null
    batches: { name: string; batch_type: string; class_level: string; centers: { name: string } } | null
  }

  const { data: logs } = await supabase
    .from('weekly_logs')
    .select(`
      id, subject, chapter_name, lectures_this_week, week_number, is_holiday,
      notes, submitted_at,
      user_profiles(name, employee_id),
      batches(name, batch_type, class_level, centers(name))
    `)
    .order('submitted_at', { ascending: false })
    .limit(200) as { data: LogRow[] | null }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Submissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">{logs?.length ?? 0} recent entries</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Teacher</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Center</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Batch</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Subject</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Chapter</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Wk</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center">Lec</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Pace</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((log, i) => {
                  const batch = log.batches as { name: string; batch_type: string; class_level: string; centers: { name: string } }
                  const teacher = log.user_profiles as { name: string; employee_id: string | null }
                  const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
                  const mIdx = new Date(log.submitted_at).getMonth()
                  const mKey = MONTHS[mIdx]
                  const pace = log.is_holiday ? null : calculatePace(batchBase, log.subject, mKey, log.lectures_this_week)

                  return (
                    <tr key={log.id} className={`border-b ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-gray-50`}>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-900">{teacher?.name}</div>
                        {teacher?.employee_id && <div className="text-[10px] text-gray-400">{teacher.employee_id}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <CenterBadge name={batch.centers.name} />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-xs text-gray-700">{batch.name}</td>
                      <td className="px-4 py-2.5">
                        {log.is_holiday ? <span className="text-orange-600 text-xs font-semibold">🟠 Holiday</span> : <SubjectBadge subject={log.subject} />}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">{log.chapter_name}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-700">{log.week_number}</td>
                      <td className="px-4 py-2.5 text-center font-bold">{log.is_holiday ? '—' : log.lectures_this_week}</td>
                      <td className="px-4 py-2.5">
                        {pace && <PaceStatusBadge status={pace.status} />}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(log.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
