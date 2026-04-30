import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getAcademicWeek } from '@/lib/pace'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await req.json()
  const { batch_id, subject, chapter_name, sub_topic, question_count, notes } = body
  if (!batch_id || !subject || !chapter_name) {
    return NextResponse.json({ error: 'batch_id, subject, chapter_name required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('question_uploads')
    .insert({
      teacher_id: profile.id,
      batch_id,
      subject,
      chapter_name: chapter_name.trim(),
      sub_topic: sub_topic?.trim() || null,
      question_date: new Date().toISOString().split('T')[0],
      week_number: getAcademicWeek(),
      question_count: question_count || 5,
      notes: notes?.trim() || null,
      status: 'uploaded',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ upload: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('id, role').eq('user_id', user.id).single()

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()
  const isHead = ['academic_head', 'director'].includes(profile?.role ?? '')
  const { error } = isHead
    ? await admin.from('question_uploads').delete().eq('id', id)
    : await admin.from('question_uploads').delete().eq('id', id).eq('teacher_id', profile!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
