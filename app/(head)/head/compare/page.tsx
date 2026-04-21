import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const revalidate = 60

export default async function ComparePage() {
  const supabase = await createClient()
  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  interface CenterRow { id: string; name: string }
  interface BatchRow { id: string; name: string; batch_type: string; class_level: string; center_id: string; centers: { name: string } }
  interface LogRow { batch_id: string; subject: string; lectures_this_week: number }

  const { data: centers } = await supabase.from('centers').select('id, name').order('name') as { data: CenterRow[] | null }
  const { data: batches } = await supabase
    .from('batches')
    .select('id, name, batch_type, class_level, center_id, centers(name)')
    .eq('is_active', true) as { data: BatchRow[] | null }
  const { data: logsRaw } = await supabase
    .from('weekly_logs')
    .select('batch_id, subject, lectures_this_week')
    .eq('is_holiday', false)
    .gte('submitted_at', monthStart)
    .lte('submitted_at', monthEnd) as { data: LogRow[] | null }

  const logMap: Record<string, number> = {}
  for (const log of (logsRaw ?? [])) {
    const key = `${log.batch_id}::${log.subject}`
    logMap[key] = (logMap[key] ?? 0) + log.lectures_this_week
  }

  // Group batches by base name (strip center-specific numbering)
  const batchGroups: Record<string, BatchRow[]> = {}
  for (const batch of (batches ?? [])) {
    const base = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
    if (!batchGroups[base]) batchGroups[base] = []
    batchGroups[base]!.push(batch)
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']

  const cr = centers?.find(c => c.name === 'College Road')
  const nr = centers?.find(c => c.name === 'Nashik Road')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Center Comparison</h1>
        <p className="text-gray-500 text-sm mt-0.5">College Road vs Nashik Road · {monthKey} {new Date().getFullYear()}</p>
      </div>

      <div className="space-y-6">
        {Object.entries(batchGroups).map(([baseName, groupBatches]) => {
          if (!groupBatches || groupBatches.length === 0) return null
          const sample = groupBatches[0]!
          const subjects = sample.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS

          const crBatches = groupBatches.filter(b => b.center_id === cr?.id)
          const nrBatches = groupBatches.filter(b => b.center_id === nr?.id)

          // For each center, aggregate across all batches of this base name
          const centerAgg = (bList: typeof groupBatches, subj: string) => {
            const total = bList.reduce((s, b) => s + (logMap[`${b.id}::${subj}`] ?? 0), 0)
            return total
          }

          return (
            <Card key={baseName}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-bold">{baseName}</CardTitle>
                  <BatchTypeBadge type={sample.batch_type} />
                  <span className="text-xs text-gray-400 font-medium">Class {sample.class_level}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Subject</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-blue-800">
                        📍 College Road {crBatches.length > 0 ? `(${crBatches.length} batch)` : '—'}
                      </th>
                      <th className="px-4 py-2.5 text-center font-semibold text-purple-800">
                        📍 Nashik Road {nrBatches.length > 0 ? `(${nrBatches.length} batch)` : '—'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(subject => {
                      const crActual = centerAgg(crBatches, subject)
                      const nrActual = centerAgg(nrBatches, subject)
                      const crPace = crBatches.length > 0 ? calculatePace(baseName, subject, monthKey, crActual) : null
                      const nrPace = nrBatches.length > 0 ? calculatePace(baseName, subject, monthKey, nrActual) : null

                      return (
                        <tr key={subject} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <SubjectBadge subject={subject} />
                          </td>
                          <td className="px-4 py-3">
                            {crBatches.length > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-bold text-gray-900">{crActual} <span className="text-gray-400 font-normal">/ {crPace?.planned}</span></span>
                                {crPace && <PaceStatusBadge status={crPace.status} showPercent percent={crPace.percent} />}
                              </div>
                            ) : <span className="text-gray-300 text-center block">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {nrBatches.length > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-bold text-gray-900">{nrActual} <span className="text-gray-400 font-normal">/ {nrPace?.planned}</span></span>
                                {nrPace && <PaceStatusBadge status={nrPace.status} showPercent percent={nrPace.percent} />}
                              </div>
                            ) : <span className="text-gray-300 text-center block">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
