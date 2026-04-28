import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'

export const revalidate = 0

export default async function ComparePage() {
  const supabase = await createClient()
  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd   = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  interface CenterRow { id: string; name: string }
  interface BatchRow  { id: string; name: string; batch_type: string; class_level: string; center_id: string; centers: { name: string } }
  interface LogRow    { batch_id: string; subject: string; lectures_this_week: number }

  const { data: centers } = await supabase.from('centers').select('id, name').order('name') as { data: CenterRow[] | null }
  const { data: batches } = await supabase
    .from('batches').select('id, name, batch_type, class_level, center_id, centers(name)').eq('is_active', true) as { data: BatchRow[] | null }
  const { data: logsRaw } = await supabase
    .from('weekly_logs').select('batch_id, subject, lectures_this_week')
    .eq('is_holiday', false).gte('submitted_at', monthStart).lte('submitted_at', monthEnd) as { data: LogRow[] | null }

  const logMap: Record<string, number> = {}
  for (const log of (logsRaw ?? [])) {
    const key = `${log.batch_id}::${log.subject}`
    logMap[key] = (logMap[key] ?? 0) + log.lectures_this_week
  }

  const batchGroups: Record<string, BatchRow[]> = {}
  for (const batch of (batches ?? [])) {
    const base = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
    if (!batchGroups[base]) batchGroups[base] = []
    batchGroups[base]!.push(batch)
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS  = ['Physics', 'Chemistry', 'Mathematics']

  const cr = centers?.find(c => c.name === 'College Road')
  const nr = centers?.find(c => c.name === 'Nashik Road')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">⚖️ Center Comparison</h1>
        <p className="text-gray-500 text-base mt-1">College Road vs Nashik Road · <span className="font-semibold text-violet-600">{monthKey} {new Date().getFullYear()}</span></p>
      </div>

      <div className="space-y-5">
        {Object.entries(batchGroups).map(([baseName, groupBatches]) => {
          if (!groupBatches || groupBatches.length === 0) return null
          const sample   = groupBatches[0]!
          const subjects = sample.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
          const crBatches = groupBatches.filter(b => b.center_id === cr?.id)
          const nrBatches = groupBatches.filter(b => b.center_id === nr?.id)
          const centerAgg = (bList: typeof groupBatches, subj: string) =>
            bList.reduce((s, b) => s + (logMap[`${b.id}::${subj}`] ?? 0), 0)

          return (
            <div key={baseName} className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-lift">
              {/* Card header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3"
                style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
                <h3 className="text-base font-black text-gray-900">{baseName}</h3>
                <BatchTypeBadge type={sample.batch_type} />
                <span className="text-xs text-gray-400 font-semibold">Class {sample.class_level}</span>
              </div>

              {/* Comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100" style={{ background: 'linear-gradient(90deg,#f8fafc,#eff6ff,#f5f3ff)' }}>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wide">
                        📍 College Road {crBatches.length > 0 ? `(${crBatches.length})` : ''}
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-violet-700 uppercase tracking-wide">
                        📍 Nashik Road {nrBatches.length > 0 ? `(${nrBatches.length})` : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject, si) => {
                      const crActual = centerAgg(crBatches, subject)
                      const nrActual = centerAgg(nrBatches, subject)
                      const crPace   = crBatches.length > 0 ? calculatePace(baseName, subject, monthKey, crActual) : null
                      const nrPace   = nrBatches.length > 0 ? calculatePace(baseName, subject, monthKey, nrActual) : null

                      return (
                        <tr key={subject} className={`border-b border-gray-50 hover:bg-violet-50/30 transition-colors ${si % 2 === 1 ? 'bg-gray-50/20' : ''}`}>
                          <td className="px-5 py-3.5">
                            <SubjectBadge subject={subject} />
                          </td>
                          <td className="px-5 py-3.5">
                            {crBatches.length > 0 ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="font-black text-gray-900 text-base">{crActual} <span className="text-gray-400 font-semibold text-sm">/ {crPace?.planned}</span></span>
                                {crPace && <PaceStatusBadge status={crPace.status} showPercent percent={crPace.percent} />}
                              </div>
                            ) : <span className="text-gray-300 text-center block font-bold">—</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            {nrBatches.length > 0 ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="font-black text-gray-900 text-base">{nrActual} <span className="text-gray-400 font-semibold text-sm">/ {nrPace?.planned}</span></span>
                                {nrPace && <PaceStatusBadge status={nrPace.status} showPercent percent={nrPace.percent} />}
                              </div>
                            ) : <span className="text-gray-300 text-center block font-bold">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
