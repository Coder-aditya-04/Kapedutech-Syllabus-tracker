import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import type { PaceStatus } from '@/lib/supabase/types'

export const revalidate = 60

export default async function DirectorOverviewPage() {
  const supabase = await createClient()
  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd   = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  interface BatchRow   { id: string; name: string; batch_type: string; class_level: string; center_id: string; centers: { name: string } }
  interface LogRow     { batch_id: string; subject: string; lectures_this_week: number; teacher_id: string; week_number: number }
  interface TeacherRow { id: string; name: string; center_id: string | null }
  interface CenterRow  { id: string; name: string }

  const [batchRes, logRes, teacherRes, centerRes] = await Promise.all([
    supabase.from('batches').select('id, name, batch_type, class_level, center_id, centers(name)').eq('is_active', true),
    supabase.from('weekly_logs').select('batch_id, subject, lectures_this_week, teacher_id, week_number').eq('is_holiday', false).gte('submitted_at', monthStart).lte('submitted_at', monthEnd),
    supabase.from('user_profiles').select('id, name, center_id').eq('role', 'teacher'),
    supabase.from('centers').select('id, name'),
  ])
  const batches  = batchRes.data  as BatchRow[]   | null
  const logsRaw  = logRes.data    as LogRow[]     | null
  const teachers = teacherRes.data as TeacherRow[] | null
  const centers  = centerRes.data  as CenterRow[]  | null

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
    const center   = (batch.centers as { name: string }).name
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual    = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const pace      = calculatePace(batchBase, subject, monthKey, actual)
      if (statusCounts[center]) statusCounts[center][pace.status]++
    }
  }

  const totalTeachers  = teachers?.length ?? 0
  const activeTeachers = weekLogs.size
  const totalLogs      = logsRaw?.length ?? 0
  const totalBatches   = batches?.length ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">📊 Director Overview</h1>
        <p className="text-gray-500 text-base mt-1">All centers · <span className="font-semibold text-violet-600">{monthKey} {new Date().getFullYear()}</span></p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 stagger">
        {[
          { label: 'Total Batches',     value: totalBatches,   icon: '🏫',
            gradient: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: 'rgba(124,58,237,0.2)', num: '#7C3AED' },
          { label: 'Teachers',          value: totalTeachers,  icon: '👨‍🏫',
            gradient: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: 'rgba(26,115,232,0.2)', num: '#1A73E8' },
          { label: 'Active This Month', value: activeTeachers, icon: '✅',
            gradient: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: 'rgba(67,160,71,0.25)', num: '#16a34a' },
          { label: 'Logs This Month',   value: totalLogs,      icon: '📋',
            gradient: 'linear-gradient(135deg,#fafafa,#f1f5f9)', border: 'rgba(100,116,139,0.2)', num: '#475569' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-5 card-lift" style={{ background: kpi.gradient, border: `1.5px solid ${kpi.border}` }}>
            <div className="text-4xl font-black mb-1" style={{ color: kpi.num }}>{kpi.value}</div>
            <div className="text-sm font-bold text-gray-600">{kpi.icon} {kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Center breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {(centers ?? []).map(center => {
          const counts         = statusCounts[center.name] ?? { behind: 0, slow: 0, on_track: 0, fast: 0, no_entry: 0 }
          const centerTeachers = teachers?.filter(t => t.center_id === center.id) ?? []
          const centerActive   = centerTeachers.filter(t => weekLogs.has(t.id)).length

          return (
            <div key={center.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-lift">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
                <CenterBadge name={center.name} />
                <span className="text-xs text-gray-500 font-semibold ml-auto">{centerActive}/{centerTeachers.length} teachers active</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'On Track', count: counts.on_track, g: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', b: 'rgba(74,222,128,0.4)', n: '#16a34a', e: '🟢' },
                    { label: 'Behind',   count: counts.behind,   g: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', b: 'rgba(248,113,113,0.4)', n: '#dc2626', e: '🔴' },
                    { label: 'No Entry', count: counts.no_entry, g: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', b: 'rgba(148,163,184,0.3)', n: '#475569', e: '⚪' },
                    { label: 'Too Fast', count: counts.fast,     g: 'linear-gradient(135deg,#eff6ff,#dbeafe)', b: 'rgba(96,165,250,0.4)',  n: '#2563eb', e: '🔵' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3" style={{ background: s.g, border: `1px solid ${s.b}` }}>
                      <div className="text-2xl font-black" style={{ color: s.n }}>{s.count}</div>
                      <div className="text-xs font-bold text-gray-500 mt-0.5">{s.e} {s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full pace table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
          <h2 className="text-lg font-bold text-gray-900">All Batches — <span className="text-violet-600">{monthKey}</span> Pace</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-left">
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Center</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Batch</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Actual</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Plan</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {(batches ?? []).flatMap(batch => {
                const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
                return subjects.map((subject, si) => {
                  const actual    = logMap[`${batch.id}::${subject}`] ?? 0
                  const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
                  const pace      = calculatePace(batchBase, subject, monthKey, actual)
                  return (
                    <tr key={`${batch.id}-${subject}`} className={`border-b border-gray-50 hover:bg-violet-50/30 transition-colors ${si % 2 === 1 ? 'bg-gray-50/20' : ''}`}>
                      <td className="px-5 py-3"><CenterBadge name={(batch.centers as { name: string }).name} /></td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-gray-900 text-sm">{batch.name}</div>
                        <BatchTypeBadge type={batch.batch_type} />
                      </td>
                      <td className="px-5 py-3"><SubjectBadge subject={subject} /></td>
                      <td className="px-5 py-3 text-center font-black text-gray-900 text-base">{actual}</td>
                      <td className="px-5 py-3 text-center text-gray-500 font-semibold">{pace.planned}</td>
                      <td className="px-5 py-3"><PaceStatusBadge status={pace.status} showPercent percent={pace.percent} /></td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
