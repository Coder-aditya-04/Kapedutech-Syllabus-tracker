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

    const { weekStart, batchId, dayName } = await req.json()
    const admin = createAdminClient()
    const { error } = await admin.from('batch_offdays').upsert(
      { batch_id: batchId, week_start: weekStart, day_name: dayName },
      { onConflict: 'batch_id,week_start,day_name', ignoreDuplicates: true }
    )
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

    const { weekStart, batchId, dayName } = await req.json()
    const admin = createAdminClient()
    await admin.from('batch_offdays').delete()
      .eq('batch_id', batchId).eq('week_start', weekStart).eq('day_name', dayName)
    revalidatePath('/head/schedule')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
