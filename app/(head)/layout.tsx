import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavLogo } from '@/components/UnacademyLogo'
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher'

const HEAD_NAV = [
  { href: '/head/dashboard',         label: '📊 Dashboard'        },
  { href: '/head/schedule',          label: '📅 Schedule'         },
  { href: '/head/compare',           label: '⚖️ Compare'          },
  { href: '/head/chapter-progress',  label: '📚 Chapter Progress' },
  { href: '/head/alerts',            label: '🔔 Alerts'           },
  { href: '/head/messages',          label: '💬 Messages'         },
  { href: '/head/logs',              label: '📋 Logs'             },
  { href: '/head/planner',           label: '🗓️ Planner'          },
  { href: '/head/batches',           label: '🏫 Batches'          },
  { href: '/head/teachers',          label: '👨‍🏫 Teachers'        },
  { href: '/head/mentorship',        label: '🤝 Mentorship'       },
  { href: '/head/holidays',          label: '🏖️ Holidays'         },
  { href: '/teacher/log',            label: '✏️ My Log'           },
]

const DIRECTOR_EXTRA = [
  { href: '/director/overview',  label: '📊 Overview'  },
  { href: '/director/analytics', label: '📈 Analytics' },
]

export default async function HeadLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || !['academic_head', 'director'].includes(profile.role)) {
    redirect('/teacher/log')
  }

  const isDirector = profile.role === 'director'
  const NAV = isDirector ? [...DIRECTOR_EXTRA, ...HEAD_NAV] : HEAD_NAV
  const initials = profile.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen relative">
      {/* ── Floating background blobs ── */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-120px', left: '-100px',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'rgba(180, 155, 240, 0.55)',
          filter: 'blur(18px)', animation: 'float1 20s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-80px',
          width: '560px', height: '560px', borderRadius: '50%',
          background: 'rgba(147, 197, 253, 0.50)',
          filter: 'blur(18px)', animation: 'float2 26s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '40%',
          width: '480px', height: '480px', borderRadius: '50%',
          background: 'rgba(216, 180, 254, 0.45)',
          filter: 'blur(16px)', animation: 'float3 32s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '10%', right: '15%',
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'rgba(253, 186, 116, 0.30)',
          filter: 'blur(20px)', animation: 'float1 28s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '20%',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'rgba(167, 243, 208, 0.35)',
          filter: 'blur(16px)', animation: 'float2 22s ease-in-out infinite reverse',
        }} />
      </div>

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 nav-glow" style={{ background: 'linear-gradient(90deg, #08090A 0%, #0f0a1e 50%, #08090A 100%)' }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, transparent, #7C3AED 20%, #1A73E8 50%, #7C3AED 80%, transparent)' }} />
        <div className="flex items-center px-8 h-[88px] gap-8 max-w-screen-2xl mx-auto">
          <NavLogo role={profile.role} />

          <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 scrollbar-hide">
            {NAV.map(l => (
              <Link key={l.href} href={l.href}
                className="shrink-0 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-[13px] font-semibold transition-all whitespace-nowrap">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="shrink-0 flex items-center gap-3">
            <Link href={`/head/teachers/${profile.id}`} className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(124,58,237,0.18)', border: '1.5px solid rgba(124,58,237,0.35)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1A73E8, #7C3AED)' }}>
                {initials}
              </div>
              <div>
                <div className="text-white text-sm font-bold leading-tight">{profile.name}</div>
                <div className="text-gray-400 text-[10px] uppercase tracking-widest">{profile.role === 'director' ? 'Director' : 'Head'}</div>
              </div>
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-gray-400 hover:text-red-400 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-red-900/30">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <RealtimeRefresher />
      <main className="relative z-10 max-w-screen-2xl mx-auto p-6 md:p-8 animate-fade-up">
        {children}
      </main>
    </div>
  )
}
