import { createClient } from '@/lib/supabase/server'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { CenterFilter } from '@/components/shared/CenterFilter'
import { calculatePace, MONTHS } from '@/lib/pace'
import type { PaceStatus } from '@/lib/supabase/types'
import { Suspense } from 'react'

export const revalidate = 0

const ROW_STYLE: Record<PaceStatus, string> = {
  behind:   'bg-red-50/70 hover:bg-red-50',
  slow:     'bg-yellow-50/60 hover:bg-yellow-50',
  on_track: 'bg-green-50/50 hover:bg-green-50',
  fast:     'bg-blue-50/50 hover:bg-blue-50',
  no_entry: 'hover:bg-gray-50/60',
}

export default async function AllLogsPage({ searchParams }: { searchParams: { center?: string } }) {
  const supabase = await createClient()

  interface LogRow {
    id: string; subject: string; chapter_name: string; lectures_this_week: number
    week_number: number; is_holiday: boolean; notes: string | null; submitted_at: string
    user_profiles: { name: string; employee_id: string | null } | null
    batches: { id: string; name: string; batch_type: string; class_level: string; center_id: string; centers: { name: string } } | null
  }

  const { data: logs } = await supabase
    .from('weekly_logs')
    .select(`id, subject, chapter_name, lectures_this_week, week_number, is_holiday, notes, submitted_at,
      user_profiles(name, employee_id), batches(id, name, batch_type, class_level, center_id, centers(name))`)
    .order('submitted_at', { ascending: false })
    .limit(200) as { data: LogRow[] | null }

  let allLogs = logs ?? []
  if (searchParams.center) {
    allLogs = allLogs.filter(l => l.batches?.center_id === searchParams.center)
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">📋 All Submissions</h1>
          <p className="text-gray-500 text-base mt-1">
            <span className="font-semibold text-violet-600">{allLogs.length}</span> recent entries
          </p>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs font-semibold">
          {[
            { label: 'Behind',   bg: 'bg-red-100',    text: 'text-red-700' },
            { label: 'On Track', bg: 'bg-green-100',  text: 'text-green-700' },
            { label: 'Slow',     bg: 'bg-yellow-100', text: 'text-yellow-700' },
            { label: 'Fast',     bg: 'bg-blue-100',   text: 'text-blue-700' },
          ].map(l => (
            <span key={l.label} className={`px-2.5 py-1 rounded-full ${l.bg} ${l.text}`}>{l.label}</span>
          ))}
        </div>
      </div>

      <div className="mb-6"><Suspense fallback={null}><CenterFilter /></Suspense></div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Latest {allLogs.length} submissions — rows coloured by pace</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-left">
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Teacher</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Center</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Batch</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Chapter</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Wk</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Lec</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Pace</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {allLogs.map(log => {
                const batch   = log.batches as { name: string; batch_type: string; class_level: string; centers: { name: string } }
                const teacher = log.user_profiles as { name: string; employee_id: string | null }
                const batchBase = batch?.name.replace(/\s*[–-]\s*\d+.*$/, '').trim() ?? ''
                const mIdx  = new Date(log.submitted_at).getMonth()
                const mKey  = MONTHS[mIdx]
                const pace  = log.is_holiday ? null : calculatePace(batchBase, log.subject, mKey, log.lectures_this_week)
                const rowClass = log.is_holiday
                  ? 'bg-orange-50/60 hover:bg-orange-50'
                  : ROW_STYLE[pace?.status ?? 'no_entry']

                return (
                  <tr key={log.id} className={`border-b border-gray-100 transition-colors ${rowClass}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900">{teacher?.name}</div>
                      {teacher?.employee_id && <div className="text-xs text-gray-400">{teacher.employee_id}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      {batch?.centers?.name && <CenterBadge name={batch.centers.name} />}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-sm text-gray-700">{batch?.name}</td>
                    <td className="px-5 py-3.5">
                      {log.is_holiday
                        ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">🟠 Holiday</span>
                        : <SubjectBadge subject={log.subject} />}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 max-w-[200px] truncate font-medium">{log.chapter_name}</td>
                    <td className="px-5 py-3.5 text-center font-black text-gray-700">{log.week_number}</td>
                    <td className="px-5 py-3.5 text-center font-black text-gray-900 text-base">{log.is_holiday ? '—' : log.lectures_this_week}</td>
                    <td className="px-5 py-3.5">
                      {pace && <PaceStatusBadge status={pace.status} />}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 font-bold whitespace-nowrap">
                      {new Date(log.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
