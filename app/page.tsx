import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile) {
    // Email signup — create default teacher profile, admin can upgrade role later
    await supabase.from('user_profiles').insert({
      user_id: user.id,
      name: user.email?.split('@')[0] ?? 'New User',
      role: 'teacher',
    })
    redirect('/teacher/log')
  }

  if (profile.role === 'teacher')       redirect('/teacher/log')
  if (profile.role === 'academic_head') redirect('/head/dashboard')
  if (profile.role === 'director')      redirect('/director/overview')
  redirect('/login')
}
