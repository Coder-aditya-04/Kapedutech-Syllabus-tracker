import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavLogo } from '@/components/UnacademyLogo'

const NAV = [
  { href: '/director/overview',         label: '📊 Overview'        },
  { href: '/director/analytics',        label: '📈 Analytics'       },
  { href: '/head/dashboard',            label: '🎯 Pace Dashboard'  },
  { href: '/head/compare',              label: '⚖️ Compare'         },
  { href: '/head/chapter-progress',     label: '📚 Chapter Progress'},
  { href: '/head/alerts',               label: '🔔 Alerts'          },
  { href: '/head/logs',                 label: '📋 Logs'            },
  { href: '/head/planner',              label: '📅 Planner'         },
  { href: '/head/batches',              label: '🏫 Batches'         },
  { href: '/head/teachers',             label: '👨‍🏫 Teachers'       },
  { href: '/head/mentorship',           label: '🤝 Mentorship'      },
  { href: '/teacher/log',               label: '✏️ My Log'          },
]

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, role')
    .eq('user_id', user.id)
    .single() as { data: { name: string; role: string } | null }

  if (profile?.role !== 'director') redirect('/head/dashboard')

  const initials = profile!.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen relative">
      {/* ── Floating background blobs ── */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-120px', left: '-100px',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'rgba(134, 207, 136, 0.50)',
          filter: 'blur(18px)', animation: 'float1 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-80px',
          width: '560px', height: '560px', borderRadius: '50%',
          background: 'rgba(147, 197, 253, 0.50)',
          filter: 'blur(18px)', animation: 'float2 28s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '40%',
          width: '480px', height: '480px', borderRadius: '50%',
          background: 'rgba(180, 155, 240, 0.45)',
          filter: 'blur(16px)', animation: 'float3 34s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '10%', right: '15%',
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'rgba(253, 186, 116, 0.30)',
          filter: 'blur(20px)', animation: 'float1 30s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '20%',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'rgba(167, 243, 208, 0.38)',
          filter: 'blur(16px)', animation: 'float2 24s ease-in-out infinite reverse',
        }} />
      </div>

      <header className="sticky top-0 z-50 nav-glow" style={{ background: 'linear-gradient(90deg, #08090A 0%, #071a0f 50%, #08090A 100%)' }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, transparent, #43A047 20%, #1A73E8 50%, #43A047 80%, transparent)' }} />
        <div className="flex items-center px-8 h-[88px] gap-8 max-w-screen-2xl mx-auto">
          <NavLogo role="director" />

          <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 scrollbar-hide">
            {NAV.map(l => (
              <Link key={l.href} href={l.href}
                className="shrink-0 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-[13px] font-semibold transition-all whitespace-nowrap">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="shrink-0 flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(67,160,71,0.18)', border: '1.5px solid rgba(67,160,71,0.35)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #43A047, #1A73E8)' }}>
                {initials}
              </div>
              <div>
                <div className="text-white text-sm font-bold leading-tight">{profile!.name}</div>
                <div className="text-gray-400 text-[10px] uppercase tracking-widest">Director</div>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button className="text-gray-400 hover:text-red-400 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-red-900/30">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-screen-2xl mx-auto p-6 md:p-8 animate-fade-up">
        {children}
      </main>
    </div>
  )
}
