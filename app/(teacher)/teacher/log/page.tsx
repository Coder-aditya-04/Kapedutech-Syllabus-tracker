import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeeklyLogForm from '@/components/teacher/WeeklyLogForm'

export default async function TeacherLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <WeeklyLogForm userId={user.id} />
}
