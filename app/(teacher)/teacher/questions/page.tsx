import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import QuestionUploadForm from '@/components/teacher/QuestionUploadForm'

export const revalidate = 0

export default async function TeacherQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles').select('id, name, role').eq('user_id', user.id).single()
  if (!profile) redirect('/login')

  const admin = createAdminClient()

  // Get teacher's active batch assignments
  const { data: rawAssign } = await admin
    .from('teacher_batch_assignments')
    .select('batch_id, subject, batches(name)')
    .eq('teacher_id', profile.id)
    .eq('is_active', true)

  type AssignRow = { batch_id: string; subject: string; batches: { name: string } | null }
  const assignments = (rawAssign as unknown as AssignRow[] ?? []).map(a => ({
    batch_id: a.batch_id,
    batch_name: a.batches?.name ?? 'Unknown',
    subject: a.subject,
  }))

  // Get recent question uploads for this teacher (last 30)
  const { data: rawUploads } = await admin
    .from('question_uploads')
    .select('id, chapter_name, sub_topic, subject, question_count, question_date, status, notes, batches(name), question_files(id, file_url, file_name, file_type, is_fair_copy)')
    .eq('teacher_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <QuestionUploadForm
      profileId={profile.id}
      assignments={assignments}
      recentUploads={(rawUploads ?? []) as unknown as Parameters<typeof QuestionUploadForm>[0]['recentUploads']}
    />
  )
}
