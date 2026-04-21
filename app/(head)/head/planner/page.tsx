import { createClient } from '@/lib/supabase/server'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function PlannerPage() {
  const supabase = await createClient()

  interface PlanRow {
    id: string; batch_type: string; subject: string; class_level: string
    month_name: string; topic_name: string; planned_lectures: number; start_date: string | null
  }

  const { data: plans } = await supabase
    .from('lecture_plans')
    .select('*')
    .order('batch_type')
    .order('subject')
    .order('month_name') as { data: PlanRow[] | null }

  // Group by batch_type
  const grouped: Record<string, PlanRow[]> = {}
  for (const plan of (plans ?? [])) {
    if (!grouped[plan.batch_type]) grouped[plan.batch_type] = []
    grouped[plan.batch_type]!.push(plan)
  }

  const BATCH_TYPE_MAP: Record<string, string> = {
    'JEE Excel': 'JEE_EXCEL',
    'NEET Excel': 'NEET_EXCEL',
    'JEE Growth': 'JEE_GROWTH',
    'NEET Growth': 'NEET_GROWTH',
  }

  const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lecture Planner</h1>
        <p className="text-gray-500 text-sm mt-0.5">Official planned lectures per month — Academic Year 2026-27</p>
      </div>

      <Tabs defaultValue={Object.keys(grouped)[0] ?? 'JEE Excel'}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {Object.keys(grouped).map(bt => (
            <TabsTrigger key={bt} value={bt} className="text-xs font-semibold">
              {bt}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(grouped).map(([batchType, planItems]) => {
          // Group by subject
          const bySubject: Record<string, typeof planItems> = {}
          for (const p of (planItems ?? [])) {
            if (!bySubject[p.subject]) bySubject[p.subject] = []
            bySubject[p.subject]!.push(p)
          }

          // Aggregate planned lectures per subject per month
          const monthTotals: Record<string, Record<string, number>> = {}
          for (const p of (planItems ?? [])) {
            if (!monthTotals[p.subject]) monthTotals[p.subject] = {}
            monthTotals[p.subject]![p.month_name] = (monthTotals[p.subject]![p.month_name] ?? 0) + p.planned_lectures
          }

          const usedMonths = Array.from(new Set(planItems?.map(p => p.month_name) ?? [])).sort(
            (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
          )
          const subjects = Object.keys(bySubject)

          return (
            <TabsContent key={batchType} value={batchType} className="space-y-6">
              {/* Summary grid */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">Monthly Lecture Counts</CardTitle>
                    <BatchTypeBadge type={BATCH_TYPE_MAP[batchType] ?? 'JEE_EXCEL'} />
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50">Subject</th>
                        {usedMonths.map(m => (
                          <th key={m} className="px-3 py-2.5 text-center font-semibold text-gray-600 min-w-[56px]">{m}</th>
                        ))}
                        <th className="px-4 py-2.5 text-center font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(subject => {
                        const monthData = monthTotals[subject] ?? {}
                        const total = Object.values(monthData).reduce((s, v) => s + v, 0)
                        return (
                          <tr key={subject} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2.5 sticky left-0 bg-white">
                              <SubjectBadge subject={subject} />
                            </td>
                            {usedMonths.map(m => (
                              <td key={m} className="px-3 py-2.5 text-center">
                                {monthData[m] ? (
                                  <span className="font-bold text-gray-900">{monthData[m]}</span>
                                ) : (
                                  <span className="text-gray-200">—</span>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-2.5 text-center font-black text-gray-900">{total}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Detailed topic list */}
              {Object.entries(bySubject).map(([subject, items]) => (
                <Card key={subject}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold">{subject} — Detailed Plan</CardTitle>
                      <SubjectBadge subject={subject} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left">
                          <th className="px-4 py-2 font-semibold text-gray-600">Month</th>
                          <th className="px-4 py-2 font-semibold text-gray-600">Topic</th>
                          <th className="px-4 py-2 font-semibold text-gray-600 text-center">Lectures</th>
                          <th className="px-4 py-2 font-semibold text-gray-600">Dates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(items ?? [])
                          .sort((a, b) => MONTH_ORDER.indexOf(a.month_name) - MONTH_ORDER.indexOf(b.month_name))
                          .map(p => (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-semibold text-gray-700 w-16">{p.month_name}</td>
                              <td className="px-4 py-2.5 text-gray-700">{p.topic_name}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-gray-900">{p.planned_lectures}</td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs">{p.start_date ?? '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
