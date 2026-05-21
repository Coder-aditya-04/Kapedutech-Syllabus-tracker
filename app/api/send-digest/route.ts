import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { getAcademicWeek } from '@/lib/pace'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Allow head/director from the UI, or service-role cron
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let callerName = 'System'
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles').select('role, name').eq('user_id', user.id).single()
    if (!profile || !['academic_head', 'director'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    callerName = profile.name
  } else {
    // Cron / service role fallback
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const currentWeek = getAcademicWeek()
  const reportWeek = currentWeek - 1
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  interface LogRow {
    subject: string; chapter_name: string; lectures_this_week: number; week_number: number
    teacher_id: string
    batches: { name: string; centers: { name: string } } | null
    user_profiles: { name: string } | null
  }

  // Logs from last week
  const { data: logs } = await supabase
    .from('weekly_logs')
    .select('subject, chapter_name, lectures_this_week, week_number, teacher_id, user_profiles(name), batches(name, centers(name))')
    .eq('week_number', reportWeek)
    .eq('is_holiday', false)
    .order('submitted_at', { ascending: false }) as { data: LogRow[] | null }

  // All teachers with active assignments
  const { data: allTeachers } = await admin
    .from('user_profiles').select('id, name, center_id').eq('role', 'teacher')
  const { data: assignments } = await admin
    .from('teacher_batch_assignments').select('teacher_id').eq('is_active', true)
  const assignedIds = new Set((assignments ?? []).map(a => a.teacher_id as string))

  const submittedIds = new Set((logs ?? []).map(l => l.teacher_id))
  const notSubmitted = (allTeachers ?? []).filter(t => assignedIds.has(t.id) && !submittedIds.has(t.id))
  const submitted    = (allTeachers ?? []).filter(t => assignedIds.has(t.id) && submittedIds.has(t.id))

  // Summary table by batch+subject
  const summary: Record<string, { lec: number; chapters: string[] }> = {}
  for (const log of (logs ?? [])) {
    if (!log.batches) continue
    const k = `${log.batches.centers.name}||${log.batches.name}||${log.subject}||${log.user_profiles?.name ?? '—'}`
    if (!summary[k]) summary[k] = { lec: 0, chapters: [] }
    summary[k].lec += log.lectures_this_week
    if (!summary[k].chapters.includes(log.chapter_name)) summary[k].chapters.push(log.chapter_name)
  }

  // Recipient emails
  const { data: mgmt } = await admin
    .from('user_profiles').select('user_id').in('role', ['academic_head', 'director'])
  const emailList: string[] = []
  for (const m of mgmt ?? []) {
    const { data: { user: mu } } = await admin.auth.admin.getUserById(m.user_id)
    if (mu?.email) emailList.push(mu.email)
  }
  if (emailList.length === 0)
    return NextResponse.json({ message: 'No recipients found' })

  const { error } = await resend.emails.send({
    from: 'Unacademy Nashik <noreply@unacademynashik.com>',
    to: emailList,
    subject: `📊 Weekly Academic Report — Week ${reportWeek} | Unacademy Nashik`,
    html: buildDigestHtml({ reportWeek, summary, submitted, notSubmitted, appUrl, callerName }),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, recipients: emailList.length, week: reportWeek })
}

function buildDigestHtml({ reportWeek, summary, submitted, notSubmitted, appUrl, callerName }: {
  reportWeek: number
  summary: Record<string, { lec: number; chapters: string[] }>
  submitted: { id: string; name: string }[]
  notSubmitted: { id: string; name: string }[]
  appUrl: string
  callerName: string
}) {
  const summaryRows = Object.entries(summary).map(([k, v]) => {
    const [center, batch, subject, teacher] = k.split('||')
    return `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 14px;font-size:13px;color:#6b7280;">${center}</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;">${batch}</td>
        <td style="padding:10px 14px;font-size:13px;color:#7C3AED;font-weight:700;">${subject}</td>
        <td style="padding:10px 14px;font-size:13px;color:#374151;">${teacher}</td>
        <td style="padding:10px 14px;font-size:14px;font-weight:900;color:#111827;text-align:center;">${v.lec}</td>
        <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${v.chapters.join(', ')}</td>
      </tr>`
  }).join('') || `<tr><td colspan="6" style="padding:20px;text-align:center;color:#9ca3af;">No logs submitted last week.</td></tr>`

  const submittedList = submitted.map(t =>
    `<span style="display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin:3px;">${t.name}</span>`
  ).join('') || '<span style="color:#9ca3af;font-size:13px;">None</span>'

  const pendingList = notSubmitted.map(t =>
    `<span style="display:inline-block;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin:3px;">${t.name}</span>`
  ).join('') || '<span style="color:#16a34a;font-size:13px;font-weight:700;">✅ All teachers submitted!</span>'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#0f0a1e,#0f1e0a);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
        <div style="display:inline-block;background:linear-gradient(135deg,#43A047,#1A73E8);border-radius:12px;padding:8px 18px;margin-bottom:12px;">
          <span style="color:#fff;font-size:13px;font-weight:800;letter-spacing:1px;">UNACADEMY NASHIK</span>
        </div>
        <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0;">📊 Weekly Academic Report</h1>
        <p style="color:#86efac;font-size:14px;margin:8px 0 0;font-weight:600;">Week ${reportWeek} Summary</p>
      </td></tr>

      <!-- Stats row -->
      <tr><td style="background:#fff;padding:24px 32px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="text-align:center;padding:16px;background:#f0fdf4;border-radius:12px;margin-right:8px;">
              <div style="font-size:28px;font-weight:900;color:#16a34a;">${submitted.length}</div>
              <div style="font-size:12px;font-weight:700;color:#166534;margin-top:2px;">✅ Submitted</div>
            </td>
            <td width="4%"></td>
            <td width="33%" style="text-align:center;padding:16px;background:#fff1f2;border-radius:12px;">
              <div style="font-size:28px;font-weight:900;color:#dc2626;">${notSubmitted.length}</div>
              <div style="font-size:12px;font-weight:700;color:#991b1b;margin-top:2px;">⚠️ Pending</div>
            </td>
            <td width="4%"></td>
            <td width="33%" style="text-align:center;padding:16px;background:#eff6ff;border-radius:12px;">
              <div style="font-size:28px;font-weight:900;color:#1d4ed8;">${Object.values(summary).reduce((s,v) => s+v.lec, 0)}</div>
              <div style="font-size:12px;font-weight:700;color:#1e40af;margin-top:2px;">📚 Total Lectures</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Log table -->
      <tr><td style="background:#fff;padding:24px 32px;">
        <h2 style="font-size:15px;font-weight:800;color:#111827;margin:0 0 12px;">📋 Lecture Submissions — Week ${reportWeek}</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Center</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Batch</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Subject</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Teacher</th>
              <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Lec</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Chapters</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </td></tr>

      <!-- Who submitted -->
      <tr><td style="background:#fff;padding:0 32px 24px;">
        <h2 style="font-size:15px;font-weight:800;color:#111827;margin:0 0 10px;">✅ Submitted (${submitted.length})</h2>
        <div>${submittedList}</div>
      </td></tr>

      <!-- Who didn't -->
      <tr><td style="background:#fff;padding:0 32px 24px;">
        <h2 style="font-size:15px;font-weight:800;color:#111827;margin:0 0 10px;">⚠️ Not Submitted (${notSubmitted.length})</h2>
        <div>${pendingList}</div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="background:#fff;padding:0 32px 32px;text-align:center;">
        <a href="${appUrl}/director/overview"
          style="display:inline-block;background:linear-gradient(135deg,#43A047,#1A73E8);color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;margin-right:12px;">
          📊 Director Overview →
        </a>
        <a href="${appUrl}/head/logs"
          style="display:inline-block;background:#f9fafb;border:2px solid #e5e7eb;color:#374151;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:12px;">
          📋 View All Logs
        </a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">Sent by <strong>${callerName}</strong> via Unacademy Nashik Academic System</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}
