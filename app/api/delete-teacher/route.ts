import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!caller || !['academic_head', 'director'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { teacherId } = await request.json()
  if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 })

  const admin = createAdminClient()

  // Get the auth user_id for this profile
  const { data: profile } = await admin
    .from('user_profiles')
    .select('user_id')
    .eq('id', teacherId)
    .single()

  // Delete assignments first, then profile, then auth user
  await admin.from('teacher_batch_assignments').delete().eq('teacher_id', teacherId)
  await admin.from('user_profiles').delete().eq('id', teacherId)

  if (profile?.user_id) {
    await admin.auth.admin.deleteUser(profile.user_id)
  }

  revalidatePath('/head/teachers')
  revalidatePath('/director/overview')
  return NextResponse.json({ success: true })
}
