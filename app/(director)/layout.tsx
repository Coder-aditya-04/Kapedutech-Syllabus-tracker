import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-[#08090A] border-b border-gray-800">
        <div className="flex items-center px-4 h-14 gap-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-[#08BD80] rounded-lg flex items-center justify-center font-black text-white text-sm">U</div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">Unacademy Nashik</div>
              <div className="text-gray-500 text-[9px] uppercase tracking-wide">Director</div>
            </div>
          </div>
          <nav className="flex items-center gap-1 flex-1">
            {[
              { href: '/director/overview', label: '📊 Overview' },
              { href: '/director/analytics', label: '📈 Analytics' },
              { href: '/head/dashboard', label: '🎓 Head Dashboard' },
              { href: '/head/compare', label: '⚖️ Compare' },
              { href: '/head/alerts', label: '⚠️ Alerts' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-xs font-semibold transition-colors whitespace-nowrap">
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="text-gray-400 text-xs">{profile.name}</span>
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  )
}
