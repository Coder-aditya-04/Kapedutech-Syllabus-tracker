import { createClient } from '@/lib/supabase/server'
import { getCurrentMonthKey, PLAN, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'

export const revalidate = 0

export default async function AlertsPage() {
  const supabase = await createClient()
  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  interface BatchRow { id: string; name: string; batch_type: string; class_level: string; centers: { name: string } }
  interface LogRow { batch_id: string; subject: string; lectures_this_week: number; teacher_id: string }

  const { data: batches } = await supabase
    .from('batches')
    .select('id, name, batch_type, class_level, centers(name)')
    .eq('is_active', true) as { data: BatchRow[] | null }

  const { data: logsRaw } = await supabase
    .from('weekly_logs')
    .select('batch_id, subject, lectures_this_week, teacher_id')
    .eq('is_holiday', false)
    .gte('submitted_at', monthStart)
    .lte('submitted_at', monthEnd) as { data: LogRow[] | null }

  const logMap: Record<string, number> = {}
  for (const log of (logsRaw ?? [])) {
    const key = `${log.batch_id}::${log.subject}`
    logMap[key] = (logMap[key] ?? 0) + log.lectures_this_week
  }

  interface Alert {
    type: 'behind' | 'fast' | 'no_entry'
    batch: { id: string; name: string; batch_type: string; centers: { name: string } }
    subject: string; actual: number; planned: number; percent: number; message: string
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS  = ['Physics', 'Chemistry', 'Mathematics']
  const alerts: Alert[] = []

  for (const batch of (batches ?? [])) {
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual  = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const planned = PLAN[batchBase]?.[subject]?.[monthKey] ?? 0
      if (!planned) continue
      const percent = actual === 0 ? 0 : Math.round((actual / planned) * 100)
      if (actual === 0) {
        alerts.push({ type: 'no_entry', batch: batch as Alert['batch'], subject, actual, planned, percent: 0, message: 'No entries logged this month — teachers may not have submitted.' })
      } else if (percent < 70) {
        alerts.push({ type: 'behind', batch: batch as Alert['batch'], subject, actual, planned, percent, message: `Only ${actual} of ${planned} planned lectures. ${planned - actual} lectures behind — needs catch-up.` })
      } else if (percent > 120) {
        alerts.push({ type: 'fast', batch: batch as Alert['batch'], subject, actual, planned, percent, message: `${actual} vs ${planned} planned (${percent}%) — risk of rushing through content.` })
      }
    }
  }

  const behind  = alerts.filter(a => a.type === 'behind')
  const noEntry = alerts.filter(a => a.type === 'no_entry')
  const fast    = alerts.filter(a => a.type === 'fast')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">🔔 Alert System</h1>
        <p className="text-gray-500 text-base mt-1">Auto-generated pace issues · <span className="font-semibold text-violet-600">{monthKey} {new Date().getFullYear()}</span></p>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-2xl p-16 text-center card-gradient">
          <div className="text-5xl mb-4">✅</div>
          <div className="text-2xl font-black text-gray-900">All batches on track!</div>
          <div className="text-gray-500 mt-2">No pace alerts for {monthKey}</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-5 stagger">
            {[
              { label: 'Behind Plan', count: behind.length,  icon: '🔴',
                gradient: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', border: 'rgba(248,113,113,0.4)', num: '#dc2626' },
              { label: 'No Entry',    count: noEntry.length, icon: '⚪',
                gradient: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: 'rgba(148,163,184,0.3)', num: '#475569' },
              { label: 'Too Fast',    count: fast.length,    icon: '🔵',
                gradient: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: 'rgba(96,165,250,0.4)',   num: '#2563eb' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-5 card-lift" style={{ background: s.gradient, border: `1.5px solid ${s.border}` }}>
                <div className="text-4xl font-black mb-1" style={{ color: s.num }}>{s.count}</div>
                <div className="text-sm font-bold text-gray-600">{s.icon} {s.label}</div>
              </div>
            ))}
          </div>

          {/* Behind alerts */}
          {behind.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid rgba(248,113,113,0.3)' }}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#fff1f2,#ffe4e6)' }}>
                <span className="text-xl">🔴</span>
                <h2 className="text-lg font-black text-red-800">Behind Plan <span className="text-red-400 font-bold">({behind.length})</span></h2>
              </div>
              <div className="bg-white divide-y divide-red-50">
                {behind.map((a, i) => (
                  <div key={i} className="flex items-start gap-5 px-6 py-4 hover:bg-red-50/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <CenterBadge name={a.batch.centers.name} />
                        <span className="font-bold text-gray-900">{a.batch.name}</span>
                        <SubjectBadge subject={a.subject} />
                        <PaceStatusBadge status="behind" showPercent percent={a.percent} />
                      </div>
                      <p className="text-sm text-gray-600">{a.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-3xl font-black text-red-600">{a.actual}</div>
                      <div className="text-xs text-gray-400 font-semibold">of {a.planned}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No entry alerts */}
          {noEntry.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid rgba(203,213,225,0.5)' }}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                <span className="text-xl">⚪</span>
                <h2 className="text-lg font-black text-gray-700">No Entry <span className="text-gray-400 font-bold">({noEntry.length})</span></h2>
              </div>
              <div className="bg-white divide-y divide-gray-50">
                {noEntry.map((a, i) => (
                  <div key={i} className="flex items-start gap-5 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <CenterBadge name={a.batch.centers.name} />
                        <span className="font-bold text-gray-900">{a.batch.name}</span>
                        <SubjectBadge subject={a.subject} />
                      </div>
                      <p className="text-sm text-gray-500">{a.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-3xl font-black text-gray-400">0</div>
                      <div className="text-xs text-gray-400 font-semibold">of {a.planned}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Too fast alerts */}
          {fast.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid rgba(96,165,250,0.3)' }}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
                <span className="text-xl">🔵</span>
                <h2 className="text-lg font-black text-blue-800">Too Fast <span className="text-blue-400 font-bold">({fast.length})</span></h2>
              </div>
              <div className="bg-white divide-y divide-blue-50">
                {fast.map((a, i) => (
                  <div key={i} className="flex items-start gap-5 px-6 py-4 hover:bg-blue-50/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <CenterBadge name={a.batch.centers.name} />
                        <span className="font-bold text-gray-900">{a.batch.name}</span>
                        <SubjectBadge subject={a.subject} />
                        <PaceStatusBadge status="fast" showPercent percent={a.percent} />
                      </div>
                      <p className="text-sm text-gray-600">{a.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-3xl font-black text-blue-600">{a.actual}</div>
                      <div className="text-xs text-gray-400 font-semibold">of {a.planned}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
