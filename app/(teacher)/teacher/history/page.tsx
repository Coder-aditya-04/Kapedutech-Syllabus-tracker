import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { calculatePace, MONTHS } from '@/lib/pace'
import { UnacademyIcon } from '@/components/UnacademyLogo'

export default async function TeacherHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  interface LogRow {
    id: string; subject: string; chapter_name: string; lectures_this_week: number
    week_number: number; is_holiday: boolean; notes: string | null; submitted_at: string
    batches: { name: string; batch_type: string; class_level: string; centers: { name: string } | null } | null
  }

  const { data: logs } = await supabase
    .from('weekly_logs')
    .select('id, subject, chapter_name, lectures_this_week, week_number, is_holiday, notes, submitted_at, batches(name, batch_type, class_level, centers(name))')
    .eq('teacher_id', profile.id)
    .order('submitted_at', { ascending: false })
    .limit(60) as { data: LogRow[] | null }

  const allLogs = logs ?? []

  // Stats: current month totals by subject
  const now = new Date()
  const currentMonthLogs = allLogs.filter(l => {
    const d = new Date(l.submitted_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !l.is_holiday
  })
  const lecturesBySubject: Record<string, number> = {}
  for (const l of currentMonthLogs) {
    lecturesBySubject[l.subject] = (lecturesBySubject[l.subject] ?? 0) + l.lectures_this_week
  }
  const totalLecturesThisMonth = Object.values(lecturesBySubject).reduce((s, v) => s + v, 0)
  const uniqueBatches = Array.from(new Set(allLogs.map(l => l.batches?.name).filter(Boolean)))

  const SUBJECT_COLORS: Record<string, string> = {
    Physics:     'bg-blue-100 text-blue-800',
    Chemistry:   'bg-purple-100 text-purple-800',
    Botany:      'bg-green-100 text-green-800',
    Zoology:     'bg-teal-100 text-teal-800',
    Mathematics: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gray-900 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="shrink-0">
            <UnacademyIcon size={30} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white leading-tight">My Log History</div>
            <div className="text-[10px] text-gray-400">{profile.name}</div>
          </div>
          <Link
            href="/teacher/log"
            className="text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            style={{ background: '#1A73E8' }}
          >
            ✏️ Log New
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-black text-gray-900">{allLogs.length}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Total Logs</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-black text-violet-600">{totalLecturesThisMonth}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">This Month</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{uniqueBatches.length}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Batches</div>
          </div>
        </div>

        {/* Subject breakdown this month */}
        {Object.keys(lecturesBySubject).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              This Month — Lectures by Subject
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(lecturesBySubject).map(([subj, count]) => (
                <div key={subj} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${SUBJECT_COLORS[subj] ?? 'bg-gray-100 text-gray-700'}`}>
                  {subj}: {count}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log entries */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            All Entries ({allLogs.length})
          </p>

          {allLogs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-gray-500 font-medium text-sm">No submissions yet</p>
              <p className="text-gray-400 text-xs mt-1">Log your first week to see history here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allLogs.map(log => {
                const batch = log.batches
                const monthIdx = new Date(log.submitted_at).getMonth()
                const monthKey = MONTHS[monthIdx]
                const batchBase = batch?.name.replace(/\s*[–-]\s*\d+.*$/, '').trim() ?? ''
                const pace = (!log.is_holiday && batch && monthKey)
                  ? calculatePace(batchBase, log.subject, monthKey, log.lectures_this_week)
                  : null
                const subjectColor = SUBJECT_COLORS[log.subject] ?? 'bg-gray-100 text-gray-700'

                return (
                  <div key={log.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                          Week {log.week_number}
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {log.is_holiday ? 'Holiday / No Class' : log.chapter_name}
                        </div>
                      </div>
                      {pace && <PaceStatusBadge status={pace.status} />}
                      {log.is_holiday && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                          Holiday
                        </span>
                      )}
                    </div>

                    {!log.is_holiday && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${subjectColor}`}>
                          {log.subject}
                        </span>
                        {batch && (
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                            {batch.name}
                          </span>
                        )}
                        {batch?.centers?.name && (
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                            {batch.centers.name}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
                          {log.lectures_this_week} lectures
                        </span>
                      </div>
                    )}

                    {log.notes && (
                      <div className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                        {log.notes}
                      </div>
                    )}

                    <div className="text-[10px] text-gray-400 font-medium">
                      {new Date(log.submitted_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
