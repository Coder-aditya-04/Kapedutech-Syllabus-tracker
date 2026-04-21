import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .single()

      if (!profile) {
        // New user — create a default teacher profile (admin upgrades role later)
        const name = data.user.user_metadata?.full_name
          || data.user.email?.split('@')[0]
          || 'New User'
        await supabase.from('user_profiles').insert({
          user_id: data.user.id,
          name,
          role: 'teacher',
        })
        return NextResponse.redirect(`${origin}/teacher/log`)
      }

      // Route by role
      if (profile.role === 'teacher')        return NextResponse.redirect(`${origin}/teacher/log`)
      if (profile.role === 'academic_head')  return NextResponse.redirect(`${origin}/head/dashboard`)
      if (profile.role === 'director')       return NextResponse.redirect(`${origin}/director/overview`)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
