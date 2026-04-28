import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// PATCH — override a single cell (change teacher/subject)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabase
      .from('user_profiles').select('role').eq('user_id', user.id).single()
    if (!caller || !['academic_head', 'director'].includes(caller.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { weekStart, batchId, date, slotIndex, teacherId, subject } = await req.json()

    const admin = createAdminClient()
    const { error } = await admin.from('weekly_schedule').upsert({
      week_start: weekStart,
      batch_id: batchId,
      date,
      slot_index: slotIndex,
      teacher_id: teacherId,
      subject,
      is_override: true,
    }, { onConflict: 'week_start,batch_id,date,slot_index' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePath('/head/schedule')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

// DELETE — clear a cell override (revert to generated)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { weekStart, batchId, date, slotIndex } = await req.json()
    const admin = createAdminClient()
    await admin.from('weekly_schedule')
      .delete()
      .eq('week_start', weekStart)
      .eq('batch_id', batchId)
      .eq('date', date)
      .eq('slot_index', slotIndex)

    revalidatePath('/head/schedule')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
