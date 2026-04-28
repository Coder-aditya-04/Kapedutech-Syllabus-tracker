import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabase
      .from('user_profiles').select('role').eq('user_id', user.id).single()
    if (!caller || !['academic_head', 'director'].includes(caller.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { weekStart, teacherId, dayName, slotIndex = -1 } = await req.json()
    const admin = createAdminClient()
    const { error } = await admin.from('teacher_absences').upsert({
      teacher_id: teacherId,
      week_start: weekStart,
      day_name: dayName,
      slot_index: slotIndex,
    }, { onConflict: 'teacher_id,week_start,day_name,slot_index', ignoreDuplicates: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePath('/head/schedule')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    const admin = createAdminClient()
    await admin.from('teacher_absences').delete().eq('id', id)
    revalidatePath('/head/schedule')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
