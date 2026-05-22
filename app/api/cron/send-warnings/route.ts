import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { getAcademicWeek } from '@/lib/pace'

// Runs automatically every Friday at 6:00 PM IST (12:30 UTC)
// Sends warning emails to all teachers who haven't submitted this week's log
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin  = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const currentWeek = getAcademicWeek()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Teachers with active assignments
  const { data: allTeachers }  = await admin.from('user_profiles').select('id, name, user_id').eq('role', 'teacher')
  const { data: assignments }  = await admin.from('teacher_batch_assignments').select('teacher_id').eq('is_active', true)
  const assignedIds = new Set((assignments ?? []).map(a => a.teacher_id as string))

  // Who already submitted this week
  const { data: logs } = await admin
    .from('weekly_logs').select('teacher_id').eq('week_number', currentWeek).eq('is_holiday', false)
  const submittedIds = new Set((logs ?? []).map(l => l.teacher_id as string))

  const pending = (allTeachers ?? []).filter(t => assignedIds.has(t.id) && !submittedIds.has(t.id))
  if (pending.length === 0)
    return NextResponse.json({ message: 'All teachers submitted — no warnings needed', week: currentWeek })

  // Head + director emails for CC; find academic head name for email body
  const { data: mgmt } = await admin.from('user_profiles').select('user_id, role, name').in('role', ['academic_head', 'director'])
  const headName = mgmt?.find(m => m.role === 'academic_head')?.name ?? 'Academic Head'
  const ccEmails: string[] = []
  for (const m of mgmt ?? []) {
    const { data: { user } } = await admin.auth.admin.getUserById(m.user_id)
    if (user?.email) ccEmails.push(user.email)
  }

  const results: { name: string; status: string }[] = []

  for (const teacher of pending) {
    const { data: { user: tu } } = await admin.auth.admin.getUserById(teacher.user_id)
    if (!tu?.email) { results.push({ name: teacher.name, status: 'no email' }); continue }

    const html = buildWarningHtml(teacher.name, headName, currentWeek, appUrl)
    const { error } = await resend.emails.send({
      from: 'Prayaas Education <noreply@prayaaseducation.co.in>',
      to: tu.email,
      cc: ccEmails.filter(e => e !== tu.email),
      subject: `⚠️ Reminder: Weekly Log Not Submitted — Week ${currentWeek}`,
      html,
    })
    results.push({ name: teacher.name, status: error ? `error: ${error.message}` : 'sent' })
  }

  return NextResponse.json({ week: currentWeek, warnings: results })
}

function buildWarningHtml(teacherName: string, headName: string, weekNumber: number, appUrl: string) {
  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="background:linear-gradient(135deg,#0f0a1e,#1a0a3e);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#1A73E8);border-radius:12px;padding:8px 18px;margin-bottom:12px;">
      <span style="color:#fff;font-size:13px;font-weight:800;letter-spacing:1px;">PRAYAAS EDUCATION</span></div>
    <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0;">⚠️ Action Required</h1>
    <p style="color:#a78bfa;font-size:13px;margin:6px 0 0;">Weekly Log Submission — Week ${weekNumber}</p>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;">
    <p style="color:#374151;font-size:15px;margin:0 0 16px;">Dear <strong>${teacherName}</strong>,</p>
    <div style="background:#fef3c7;border:1.5px solid #fbbf24;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 6px;">📋 Your weekly log for Week ${weekNumber} has not been submitted yet.</p>
      <p style="color:#b45309;font-size:13px;margin:0;">Please submit it today — this is an automated reminder sent every Friday.</p>
    </div>
    <p style="color:#6b7280;font-size:14px;margin:0 0 8px;">If you were unable to conduct classes, please:</p>
    <ol style="color:#374151;font-size:14px;padding-left:20px;margin:0 0 24px;line-height:2;">
      <li>Submit your log with 0 lectures and note the reason</li>
      <li>Inform your Academic Head: <strong>${headName}</strong> directly</li>
    </ol>
    <div style="text-align:center;margin:28px 0;">
      <a href="${appUrl}/teacher/log"
        style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#1A73E8);color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;">
        📝 Submit My Weekly Log →</a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
      This is an automated reminder · Do not reply to this email</p>
  </td></tr>
  <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">Prayaas Education · Academic Management System</p>
  </td></tr>
</table></td></tr></table>
</body></html>`
}
