import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeeklyLogForm from '@/components/teacher/WeeklyLogForm'

export default async function TeacherLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, name')
    .eq('user_id', user.id)
    .single()

  return (
    <WeeklyLogForm
      userId={user.id}
      userRole={profile?.role ?? 'teacher'}
      userName={profile?.name ?? 'Teacher'}
    />
  )
}
