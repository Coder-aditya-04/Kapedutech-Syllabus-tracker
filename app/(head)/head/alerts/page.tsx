import { createClient } from '@/lib/supabase/server'
import { getCurrentMonthKey, PLAN, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const revalidate = 60

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

  // Aggregate
  const logMap: Record<string, number> = {}
  const teacherSubmitted: Record<string, Set<string>> = {}
  for (const log of (logsRaw ?? [])) {
    const key = `${log.batch_id}::${log.subject}`
    logMap[key] = (logMap[key] ?? 0) + log.lectures_this_week
    if (!teacherSubmitted[log.batch_id]) teacherSubmitted[log.batch_id] = new Set()
    teacherSubmitted[log.batch_id].add(log.teacher_id)
  }

  // Build alerts
  interface Alert {
    type: 'behind' | 'fast' | 'no_entry'
    batch: { id: string; name: string; batch_type: string; centers: { name: string } }
    subject: string
    actual: number
    planned: number
    percent: number
    message: string
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']

  const alerts: Alert[] = []

  for (const batch of (batches ?? [])) {
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const planned = PLAN[batchBase]?.[subject]?.[monthKey] ?? 0
      if (!planned) continue

      const percent = actual === 0 ? 0 : Math.round((actual / planned) * 100)

      if (actual === 0) {
        alerts.push({ type: 'no_entry', batch: batch as Alert['batch'], subject, actual, planned, percent: 0, message: 'No entries logged this month. Teachers may not have submitted.' })
      } else if (percent < 70) {
        alerts.push({ type: 'behind', batch: batch as Alert['batch'], subject, actual, planned, percent, message: `Only ${actual} of ${planned} planned lectures. ${planned - actual} lectures behind — needs catch-up sessions.` })
      } else if (percent > 120) {
        alerts.push({ type: 'fast', batch: batch as Alert['batch'], subject, actual, planned, percent, message: `${actual} vs ${planned} planned. Running ${percent}% of plan — risk of rushing through content.` })
      }
    }
  }

  const behind = alerts.filter(a => a.type === 'behind')
  const noEntry = alerts.filter(a => a.type === 'no_entry')
  const fast = alerts.filter(a => a.type === 'fast')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alert System</h1>
        <p className="text-gray-500 text-sm mt-0.5">Auto-generated pace issues · {monthKey} {new Date().getFullYear()}</p>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">✅</div>
            <div className="text-xl font-bold text-gray-900">All batches on track!</div>
            <div className="text-gray-500 text-sm mt-2">No pace alerts for {monthKey}</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Behind Plan', count: behind.length, color: 'text-red-700', bg: 'bg-red-50', icon: '🔴' },
              { label: 'No Entry', count: noEntry.length, color: 'text-gray-600', bg: 'bg-gray-50', icon: '⚪' },
              { label: 'Too Fast', count: fast.length, color: 'text-blue-700', bg: 'bg-blue-50', icon: '🔵' },
            ].map(s => (
              <Card key={s.label} className={`${s.bg} border-0`}>
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-black">{s.count}</div>
                  <div className={`text-sm font-semibold ${s.color}`}>{s.icon} {s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Behind alerts */}
          {behind.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3 bg-red-50 rounded-t-lg">
                <CardTitle className="text-red-800 text-base">🔴 Behind Plan ({behind.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {behind.map((a, i) => (
                  <div key={i} className="flex items-start gap-4 px-4 py-3 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CenterBadge name={a.batch.centers.name} />
                        <span className="font-semibold text-sm">{a.batch.name}</span>
                        <SubjectBadge subject={a.subject} />
                        <PaceStatusBadge status="behind" showPercent percent={a.percent} />
                      </div>
                      <p className="text-sm text-gray-600">{a.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-black text-red-600">{a.actual}</div>
                      <div className="text-xs text-gray-400">of {a.planned}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* No entry alerts */}
          {noEntry.length > 0 && (
            <Card className="border-gray-200">
              <CardHeader className="pb-3 bg-gray-50 rounded-t-lg">
                <CardTitle className="text-gray-700 text-base">⚪ No Entry ({noEntry.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {noEntry.map((a, i) => (
                  <div key={i} className="flex items-start gap-4 px-4 py-3 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CenterBadge name={a.batch.centers.name} />
                        <span className="font-semibold text-sm">{a.batch.name}</span>
                        <SubjectBadge subject={a.subject} />
                      </div>
                      <p className="text-sm text-gray-500">{a.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-black text-gray-400">0</div>
                      <div className="text-xs text-gray-400">of {a.planned}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Too fast alerts */}
          {fast.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3 bg-blue-50 rounded-t-lg">
                <CardTitle className="text-blue-800 text-base">🔵 Too Fast ({fast.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {fast.map((a, i) => (
                  <div key={i} className="flex items-start gap-4 px-4 py-3 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CenterBadge name={a.batch.centers.name} />
                        <span className="font-semibold text-sm">{a.batch.name}</span>
                        <SubjectBadge subject={a.subject} />
                        <PaceStatusBadge status="fast" showPercent percent={a.percent} />
                      </div>
                      <p className="text-sm text-gray-600">{a.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-black text-blue-600">{a.actual}</div>
                      <div className="text-xs text-gray-400">of {a.planned}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
