import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabase
      .from('user_profiles').select('role').eq('user_id', user.id).single()
    if (!caller || !['academic_head', 'director'].includes(caller.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { profileId, code } = await req.json()
    const admin = createAdminClient()
    const { error } = await admin.from('user_profiles')
      .update({ teacher_code: code || null })
      .eq('id', profileId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePath('/head/teachers')
    revalidatePath('/head/schedule')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
