import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await req.json()
  const { upload_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty } = body
  if (!upload_id || !question_text) {
    return NextResponse.json({ error: 'upload_id and question_text required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Auto-number if not provided
  let qNum = question_number
  if (!qNum) {
    const { count } = await admin.from('typed_questions').select('id', { count: 'exact' }).eq('upload_id', upload_id)
    qNum = (count ?? 0) + 1
  }

  const { data, error } = await admin
    .from('typed_questions')
    .insert({
      upload_id,
      question_number: qNum,
      question_text: question_text.trim(),
      option_a: option_a?.trim() || null,
      option_b: option_b?.trim() || null,
      option_c: option_c?.trim() || null,
      option_d: option_d?.trim() || null,
      correct_answer: correct_answer || null,
      difficulty: difficulty || 'medium',
      typed_by: profile.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update upload status
  await admin.from('question_uploads').update({ status: 'dtp_done' }).eq('id', upload_id)

  return NextResponse.json({ question: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('typed_questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
