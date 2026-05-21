import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { getAcademicWeek } from '@/lib/pace'

// Runs automatically every Saturday at 9:00 PM IST (15:30 UTC)
// Configured in vercel.json crons
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const currentWeek = getAcademicWeek()
  const reportWeek  = currentWeek - 1
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  interface LogRow {
    subject: string; chapter_name: string; lectures_this_week: number
    teacher_id: string
    batches: { name: string; centers: { name: string } } | null
    user_profiles: { name: string } | null
  }

  const { data: logs } = await admin
    .from('weekly_logs')
    .select('subject, chapter_name, lectures_this_week, teacher_id, user_profiles(name), batches(name, centers(name))')
    .eq('week_number', reportWeek)
    .eq('is_holiday', false) as { data: LogRow[] | null }

  const { data: allTeachers } = await admin
    .from('user_profiles').select('id, name').eq('role', 'teacher')
  const { data: assignments } = await admin
    .from('teacher_batch_assignments').select('teacher_id').eq('is_active', true)
  const assignedIds  = new Set((assignments ?? []).map(a => a.teacher_id as string))
  const submittedIds = new Set((logs ?? []).map(l => l.teacher_id))
  const notSubmitted = (allTeachers ?? []).filter(t => assignedIds.has(t.id) && !submittedIds.has(t.id))
  const submitted    = (allTeachers ?? []).filter(t => assignedIds.has(t.id) && submittedIds.has(t.id))

  const summary: Record<string, { lec: number; chapters: string[] }> = {}
  for (const log of (logs ?? [])) {
    if (!log.batches) continue
    const k = `${log.batches.centers.name}||${log.batches.name}||${log.subject}||${log.user_profiles?.name ?? '—'}`
    if (!summary[k]) summary[k] = { lec: 0, chapters: [] }
    summary[k].lec += log.lectures_this_week
    if (!summary[k].chapters.includes(log.chapter_name)) summary[k].chapters.push(log.chapter_name)
  }

  const { data: mgmt } = await admin
    .from('user_profiles').select('user_id').in('role', ['academic_head', 'director'])
  const emailList: string[] = []
  for (const m of mgmt ?? []) {
    const { data: { user } } = await admin.auth.admin.getUserById(m.user_id)
    if (user?.email) emailList.push(user.email)
  }
  if (emailList.length === 0)
    return NextResponse.json({ message: 'No recipients' })

  const summaryRows = Object.entries(summary).map(([k, v]) => {
    const [center, batch, subject, teacher] = k.split('||')
    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 14px;font-size:13px;color:#6b7280;">${center}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;">${batch}</td>
      <td style="padding:10px 14px;font-size:13px;color:#7C3AED;font-weight:700;">${subject}</td>
      <td style="padding:10px 14px;font-size:13px;color:#374151;">${teacher}</td>
      <td style="padding:10px 14px;font-size:14px;font-weight:900;color:#111827;text-align:center;">${v.lec}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${v.chapters.join(', ')}</td>
    </tr>`
  }).join('') || `<tr><td colspan="6" style="padding:20px;text-align:center;color:#9ca3af;">No logs submitted last week.</td></tr>`

  const submittedChips = submitted.map(t =>
    `<span style="display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin:3px;">${t.name}</span>`
  ).join('') || '<span style="color:#9ca3af;">None</span>'

  const pendingChips = notSubmitted.map(t =>
    `<span style="display:inline-block;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin:3px;">${t.name}</span>`
  ).join('') || '<span style="color:#16a34a;font-weight:700;">✅ All submitted!</span>'

  const html = `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;">
  <tr><td style="background:linear-gradient(135deg,#0f0a1e,#0f1e0a);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#43A047,#1A73E8);border-radius:12px;padding:8px 18px;margin-bottom:12px;">
      <span style="color:#fff;font-size:13px;font-weight:800;letter-spacing:1px;">PRAYAAS EDUCATION</span></div>
    <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0;">📊 Weekly Academic Report</h1>
    <p style="color:#86efac;font-size:14px;margin:8px 0 0;">Week ${reportWeek} — Auto Summary</p>
  </td></tr>
  <tr><td style="background:#fff;padding:24px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="33%" style="text-align:center;padding:16px;background:#f0fdf4;border-radius:12px;">
        <div style="font-size:28px;font-weight:900;color:#16a34a;">${submitted.length}</div>
        <div style="font-size:12px;font-weight:700;color:#166534;margin-top:2px;">✅ Submitted</div></td>
      <td width="4%"></td>
      <td width="33%" style="text-align:center;padding:16px;background:#fff1f2;border-radius:12px;">
        <div style="font-size:28px;font-weight:900;color:#dc2626;">${notSubmitted.length}</div>
        <div style="font-size:12px;font-weight:700;color:#991b1b;margin-top:2px;">⚠️ Pending</div></td>
      <td width="4%"></td>
      <td width="33%" style="text-align:center;padding:16px;background:#eff6ff;border-radius:12px;">
        <div style="font-size:28px;font-weight:900;color:#1d4ed8;">${Object.values(summary).reduce((s,v)=>s+v.lec,0)}</div>
        <div style="font-size:12px;font-weight:700;color:#1e40af;margin-top:2px;">📚 Total Lectures</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#fff;padding:24px 32px;">
    <h2 style="font-size:15px;font-weight:800;color:#111827;margin:0 0 12px;">📋 Lecture Submissions</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Center</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Batch</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Subject</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Teacher</th>
        <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Lec</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Chapters</th>
      </tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  </td></tr>
  <tr><td style="background:#fff;padding:0 32px 16px;">
    <h2 style="font-size:15px;font-weight:800;color:#111827;margin:0 0 10px;">✅ Submitted (${submitted.length})</h2>
    <div>${submittedChips}</div>
  </td></tr>
  <tr><td style="background:#fff;padding:0 32px 24px;">
    <h2 style="font-size:15px;font-weight:800;color:#111827;margin:0 0 10px;">⚠️ Not Submitted (${notSubmitted.length})</h2>
    <div>${pendingChips}</div>
  </td></tr>
  <tr><td style="background:#fff;padding:0 32px 32px;text-align:center;">
    <a href="${appUrl}/director/overview" style="display:inline-block;background:linear-gradient(135deg,#43A047,#1A73E8);color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;">
      📊 Open Director Overview →</a>
  </td></tr>
  <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">Auto-sent every Saturday · Prayaas Education Academic System</p>
  </td></tr>
</table></td></tr></table>
</body></html>`

  const { error } = await resend.emails.send({
    from: 'Prayaas Education <noreply@prayaaseducation.co.in>',
    to: emailList,
    subject: `📊 Weekly Report — Week ${reportWeek} | Prayaas Education`,
    html,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, recipients: emailList.length, week: reportWeek })
}
