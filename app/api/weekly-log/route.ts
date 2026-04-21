import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()
  const { batch_id, subject, chapter_name, subtopics_covered, lectures_this_week, week_number, notes, is_holiday } = body

  if (!batch_id || !subject || !chapter_name || week_number == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase.from('weekly_logs').insert({
    teacher_id: profile.id,
    batch_id,
    subject,
    chapter_name,
    subtopics_covered: subtopics_covered || null,
    lectures_this_week: is_holiday ? 0 : (parseInt(lectures_this_week) || 0),
    week_number: parseInt(week_number),
    notes: notes || null,
    is_holiday: Boolean(is_holiday),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
