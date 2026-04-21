import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { getAcademicWeek } from '@/lib/pace'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  // Allow only service role or cron trigger
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const currentWeek = getAcademicWeek()

  interface LogRow {
    subject: string; chapter_name: string; lectures_this_week: number; week_number: number
    batches: { name: string; centers: { name: string } } | null
    user_profiles: { name: string } | null
  }

  const { data: logs } = (await supabase
    .from('weekly_logs')
    .select(`
      subject, chapter_name, lectures_this_week, week_number,
      user_profiles(name),
      batches(name, centers(name))
    `)
    .eq('week_number', currentWeek - 1)
    .eq('is_holiday', false)
    .order('submitted_at', { ascending: false })) as { data: LogRow[] | null }

  const summary: Record<string, { lec: number; chapters: Set<string> }> = {}
  for (const log of (logs ?? [])) {
    const batch = log.batches
    if (!batch) continue
    const k = `${batch.centers.name} | ${batch.name} | ${log.subject}`
    if (!summary[k]) summary[k] = { lec: 0, chapters: new Set() }
    summary[k].lec += log.lectures_this_week
    summary[k].chapters.add(log.chapter_name)
  }

  const rows = Object.entries(summary)
    .map(([k, v]) => `  ${k}: ${v.lec} lectures | Topics: ${Array.from(v.chapters).join(', ')}`)
    .join('\n') || '  No entries this week.'

  const { data: head } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'academic_head')
  const { data: director } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'director')

  // Get emails
  const userIds = [
    ...(head ?? []).map(h => h.user_id),
    ...(director ?? []).map(d => d.user_id),
  ]

  const emailList: string[] = []
  for (const uid of userIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(uid)
    if (user?.email) emailList.push(user.email)
  }

  if (emailList.length === 0) {
    return NextResponse.json({ message: 'No recipients found' })
  }

  const wStr = `Week ${currentWeek - 1}`
  const { error } = await resend.emails.send({
    from: 'Academic System <noreply@unacademynashik.com>',
    to: emailList,
    subject: `📊 Weekly Academic Report — ${wStr} | Unacademy Nashik`,
    text: `Good Morning,

WEEKLY LECTURE SUMMARY — ${wStr}
${'─'.repeat(60)}
${rows}
${'─'.repeat(60)}

Open Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/head/dashboard
Check Alerts: ${process.env.NEXT_PUBLIC_APP_URL}/head/alerts

— Academic Performance System`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, recipients: emailList.length, week: wStr })
}
