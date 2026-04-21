import { createClient } from '@/lib/supabase/server'
import { calculatePace, getCurrentMonthKey, MONTHS } from '@/lib/pace'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const monthKey = getCurrentMonthKey()
  const monthIdx = MONTHS.indexOf(monthKey as typeof MONTHS[number])
  const monthStart = new Date(new Date().getFullYear(), monthIdx, 1).toISOString()
  const monthEnd = new Date(new Date().getFullYear(), monthIdx + 1, 0, 23, 59, 59).toISOString()

  interface BatchRow { id: string; name: string; batch_type: string; class_level: string; centers: { name: string } }
  interface LogRow { batch_id: string; subject: string; lectures_this_week: number }

  const { data: batches } = (await supabase
    .from('batches')
    .select('id, name, batch_type, class_level, centers(name)')
    .eq('is_active', true)) as { data: BatchRow[] | null }

  const { data: logsRaw } = (await supabase
    .from('weekly_logs')
    .select('batch_id, subject, lectures_this_week')
    .eq('is_holiday', false)
    .gte('submitted_at', monthStart)
    .lte('submitted_at', monthEnd)) as { data: LogRow[] | null }

  const logMap: Record<string, number> = {}
  for (const log of (logsRaw ?? [])) {
    const key = `${log.batch_id}::${log.subject}`
    logMap[key] = (logMap[key] ?? 0) + log.lectures_this_week
  }

  const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
  const JEE_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']
  const alerts = []

  for (const batch of (batches ?? [])) {
    const subjects = batch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS
    for (const subject of subjects) {
      const actual = logMap[`${batch.id}::${subject}`] ?? 0
      const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const pace = calculatePace(batchBase, subject, monthKey, actual)
      if (pace.status === 'behind' || pace.status === 'fast' || pace.status === 'no_entry') {
        alerts.push({
          batch: batch.name,
          center: batch.centers.name,
          subject,
          status: pace.status,
          actual,
          planned: pace.planned,
          percent: pace.percent,
        })
      }
    }
  }

  return NextResponse.json({ month: monthKey, alertCount: alerts.length, alerts })
}
