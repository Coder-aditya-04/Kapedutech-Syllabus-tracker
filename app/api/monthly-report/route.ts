import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabase
      .from('user_profiles')
      .select('role, name')
      .eq('user_id', user.id)
      .single()

    if (!caller || !['academic_head', 'director'].includes(caller.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const monthName = now.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' })
    const year = now.getFullYear()
    const monthShort = now.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })

    const admin = createAdminClient()

    // ── Fetch data ────────────────────────────────────────────────────────
    interface LogRow {
      subject: string; chapter_name: string; lectures_this_week: number
      notes: string | null; submitted_at: string
      user_profiles: { name: string; employee_id: string | null } | null
      batches: { name: string; batch_type: string; centers: { name: string } } | null
    }
    interface PlanRow {
      batch_type: string; subject: string; topic_name: string; planned_lectures: number; month_name: string
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const [{ data: rawLogs }, { data: rawPlans }, { data: teachers }, { data: heads }, { data: directors }] = await Promise.all([
      admin.from('weekly_logs')
        .select('subject, chapter_name, lectures_this_week, notes, submitted_at, user_profiles(name, employee_id), batches(name, batch_type, centers(name))')
        .eq('is_holiday', false)
        .gte('submitted_at', monthStart)
        .lte('submitted_at', monthEnd),
      admin.from('lecture_plans').select('batch_type, subject, topic_name, planned_lectures, month_name').eq('month_name', monthShort),
      admin.from('user_profiles').select('name, user_id').eq('role', 'teacher'),
      admin.from('user_profiles').select('name, user_id').eq('role', 'academic_head'),
      admin.from('user_profiles').select('name, user_id').eq('role', 'director'),
    ])

    const logs  = (rawLogs  ?? []) as unknown as LogRow[]
    const plans = (rawPlans ?? []) as PlanRow[]

    // ── Aggregate per teacher ─────────────────────────────────────────────
    const teacherMap = new Map<string, { batches: Set<string>; lectures: number; chapters: Set<string> }>()
    for (const log of logs) {
      const tName = log.user_profiles?.name ?? 'Unknown'
      const bName = log.batches?.name ?? '?'
      if (!teacherMap.has(tName)) teacherMap.set(tName, { batches: new Set(), lectures: 0, chapters: new Set() })
      const t = teacherMap.get(tName)!
      t.batches.add(bName)
      t.lectures += log.lectures_this_week
      t.chapters.add(log.chapter_name)
    }

    // ── Chapter completion rate ───────────────────────────────────────────
    const plannedThisMonth = plans.length
    const completedTopics  = new Set<string>()
    for (const log of logs) {
      if (log.notes?.includes('✅ Chapter completed.')) completedTopics.add(log.chapter_name)
    }
    const completedCount = completedTopics.size

    // ── Non-submitters ────────────────────────────────────────────────────
    const submittedTeachers = new Set(logs.map(l => l.user_profiles?.name).filter(Boolean))
    const allTeachers = (teachers ?? []).map(t => t.name)
    const missing = allTeachers.filter(n => !submittedTeachers.has(n))

    // ── Build email HTML ──────────────────────────────────────────────────
    const teacherRows = Array.from(teacherMap.entries())
      .sort((a, b) => b[1].lectures - a[1].lectures)
      .map(([name, data]) =>
        `<tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 16px;font-weight:600;color:#111">${name}</td>
          <td style="padding:10px 16px;color:#6b7280;font-size:13px">${Array.from(data.batches).join(', ')}</td>
          <td style="padding:10px 16px;text-align:center;font-weight:800;color:#7C3AED;font-size:16px">${data.lectures}</td>
          <td style="padding:10px 16px;text-align:center;color:#374151">${data.chapters.size}</td>
        </tr>`
      ).join('')

    const missingHtml = missing.length
      ? `<div style="margin-top:24px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;">
          <p style="font-weight:800;color:#b91c1c;margin:0 0 8px">⚠️ No submissions this month (${missing.length} teachers):</p>
          <p style="color:#dc2626;margin:0;font-size:14px">${missing.join(', ')}</p>
        </div>`
      : `<div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
          <p style="font-weight:800;color:#15803d;margin:0">✅ All teachers submitted at least one log this month!</p>
        </div>`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7C3AED,#1A73E8);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">📊 Monthly Academic Report</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:16px;">${monthName} ${year}</p>
    </div>

    <div style="padding:32px;">
      <!-- Summary stats -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:28px;">
        <div style="background:#f5f3ff;border:1.5px solid #e9d5ff;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#7C3AED;">${logs.reduce((s, l) => s + l.lectures_this_week, 0)}</div>
          <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:4px;">Total Lectures</div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#16a34a;">${completedCount}</div>
          <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:4px;">Chapters Completed</div>
        </div>
        <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#2563eb;">${plannedThisMonth}</div>
          <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:4px;">Chapters Planned</div>
        </div>
      </div>

      <!-- Teacher table -->
      <h2 style="font-size:16px;font-weight:900;color:#111;margin:0 0 12px;">Teacher-wise Summary</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Teacher</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Batch</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Lectures</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Chapters</th>
          </tr>
        </thead>
        <tbody>${teacherRows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;">No logs submitted this month</td></tr>'}</tbody>
      </table>

      ${missingHtml}

      <!-- Footer -->
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">Sent by Kapedutech Syllabus Tracker · ${monthName} ${year}</p>
        <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">Triggered by ${caller.name}</p>
      </div>
    </div>
  </div>
</body>
</html>`

    // ── Collect recipient emails ───────────────────────────────────────────
    const recipientIds = [
      ...(heads    ?? []).map(h => h.user_id),
      ...(directors ?? []).map(d => d.user_id),
    ]
    const emailList: string[] = []
    for (const uid of recipientIds) {
      const { data: { user: u } } = await admin.auth.admin.getUserById(uid)
      if (u?.email) emailList.push(u.email)
    }

    if (emailList.length === 0) {
      return NextResponse.json({ error: 'No recipients found — check that heads/directors have email addresses' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Kapedutech Reports <noreply@unacademynashik.com>',
      to: emailList,
      subject: `📊 Monthly Academic Report — ${monthName} ${year}`,
      html,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, recipients: emailList.length, month: `${monthName} ${year}` })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
