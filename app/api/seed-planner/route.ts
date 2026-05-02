import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANNER_TEMPLATES } from '@/lib/planner-templates'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabase
      .from('user_profiles').select('role').eq('user_id', user.id).single()
    if (!caller || !['academic_head', 'director'].includes(caller.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { templateKey } = await req.json() as { templateKey: string }
    const template = PLANNER_TEMPLATES[templateKey]
    if (!template) return NextResponse.json({ error: 'Unknown template' }, { status: 400 })

    const admin = createAdminClient()

    // Delete existing entries for this batch_type first (re-import is idempotent)
    await admin.from('lecture_plans').delete().eq('batch_type', template.batch_type)

    const rows = template.entries.map(e => ({
      batch_type: template.batch_type,
      class_level: template.class_level,
      subject: e.subject,
      topic_name: e.topic_name,
      planned_lectures: e.planned_lectures,
      month_name: e.month_name,
      start_date: null,
    }))

    const { error } = await admin.from('lecture_plans').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, inserted: rows.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
