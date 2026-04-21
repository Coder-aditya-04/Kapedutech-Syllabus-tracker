import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public paths — no auth needed
  const publicPaths = ['/login', '/auth/callback', '/enquiry']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return supabaseResponse
  }

  // Not authenticated — redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Get user role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role

  // No profile yet — send to onboarding (handled by /login)
  if (!role) {
    if (pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Redirect root to role dashboard
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    if (role === 'teacher')       url.pathname = '/teacher/log'
    else if (role === 'academic_head') url.pathname = '/head/dashboard'
    else if (role === 'director') url.pathname = '/director/overview'
    else                          url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based route guards
  if (pathname.startsWith('/teacher') && role !== 'teacher') {
    return NextResponse.redirect(new URL('/head/dashboard', request.url))
  }
  if (pathname.startsWith('/head') && !['academic_head', 'director'].includes(role)) {
    return NextResponse.redirect(new URL('/teacher/log', request.url))
  }
  if (pathname.startsWith('/director') && role !== 'director') {
    return NextResponse.redirect(new URL('/head/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
