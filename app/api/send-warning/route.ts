import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { getAcademicWeek } from '@/lib/pace'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('user_profiles').select('role, name').eq('user_id', user.id).single()
  if (!['academic_head', 'director'].includes(caller?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { teacherId } = await req.json()
  if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 })

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const currentWeek = getAcademicWeek()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Teacher profile
  const { data: teacher } = await admin
    .from('user_profiles').select('name, user_id').eq('id', teacherId).single()
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

  const { data: { user: teacherUser } } = await admin.auth.admin.getUserById(teacher.user_id)
  const teacherEmail = teacherUser?.email
  if (!teacherEmail) return NextResponse.json({ error: 'Teacher has no email' }, { status: 404 })

  // Head + director emails for CC
  const { data: mgmt } = await admin
    .from('user_profiles').select('user_id').in('role', ['academic_head', 'director'])
  const ccEmails: string[] = []
  for (const m of mgmt ?? []) {
    const { data: { user: mu } } = await admin.auth.admin.getUserById(m.user_id)
    if (mu?.email && mu.email !== teacherEmail) ccEmails.push(mu.email)
  }

  const { error } = await resend.emails.send({
    from: 'Prayaas Education <noreply@prayaaseducation.co.in>',
    to: teacherEmail,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    subject: `⚠️ Reminder: Weekly Log Not Submitted — Week ${currentWeek}`,
    html: buildWarningHtml({
      teacherName: teacher.name,
      senderName: caller!.name,
      weekNumber: currentWeek,
      appUrl,
    }),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, to: teacherEmail })
}

function buildWarningHtml({ teacherName, senderName, weekNumber, appUrl }: {
  teacherName: string; senderName: string; weekNumber: number; appUrl: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f0a1e,#1a0a3e);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <div style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#1A73E8);border-radius:12px;padding:8px 18px;margin-bottom:12px;">
            <span style="color:#fff;font-size:13px;font-weight:800;letter-spacing:1px;">PRAYAAS EDUCATION</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0;">⚠️ Action Required</h1>
          <p style="color:#a78bfa;font-size:13px;margin:6px 0 0;">Weekly Log Submission — Week ${weekNumber}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;">
          <p style="color:#374151;font-size:15px;margin:0 0 16px;">Dear <strong>${teacherName}</strong>,</p>

          <div style="background:#fef3c7;border:1.5px solid #fbbf24;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 6px;">📋 Your weekly log for Week ${weekNumber} has not been submitted yet.</p>
            <p style="color:#b45309;font-size:13px;margin:0;">Please submit it as soon as possible so the Academic Head can track your progress.</p>
          </div>

          <p style="color:#6b7280;font-size:14px;margin:0 0 8px;">If you were unable to conduct classes this week due to a valid reason, please:</p>
          <ol style="color:#374151;font-size:14px;padding-left:20px;margin:0 0 24px;line-height:2;">
            <li>Submit your log with 0 lectures and note the reason</li>
            <li>Inform your Academic Head: <strong>${senderName}</strong> directly</li>
          </ol>

          <div style="text-align:center;margin:28px 0;">
            <a href="${appUrl}/teacher/log"
              style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#1A73E8);color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;">
              📝 Submit My Weekly Log →
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
            This reminder was sent by <strong>${senderName}</strong> via the Prayaas Education Academic System.<br>
            Please do not reply to this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">Prayaas Education · Academic Management System</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
