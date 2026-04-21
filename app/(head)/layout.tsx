import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const NAV_LINKS = [
  { href: '/head/dashboard',  label: 'Dashboard',     icon: '📊' },
  { href: '/head/compare',    label: 'Center Compare', icon: '⚖️' },
  { href: '/head/alerts',     label: 'Alerts',         icon: '⚠️' },
  { href: '/head/logs',       label: 'All Logs',       icon: '📋' },
  { href: '/head/planner',    label: 'Planner',        icon: '📅' },
  { href: '/head/batches',    label: 'Batches',        icon: '🏫' },
  { href: '/head/teachers',   label: 'Teachers',       icon: '👨‍🏫' },
  { href: '/head/mentorship', label: 'Mentorship',     icon: '🤝' },
  { href: '/head/holidays',   label: 'Holidays',       icon: '🗓️' },
]

export default async function HeadLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || !['academic_head', 'director'].includes(profile.role)) {
    redirect('/teacher/log')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-[#08090A] border-b border-gray-800">
        <div className="flex items-center px-4 h-14 gap-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-[#08BD80] rounded-lg flex items-center justify-center font-black text-white text-sm">U</div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">Unacademy Nashik</div>
              <div className="text-gray-500 text-[9px] uppercase tracking-wide">{profile.role === 'director' ? 'Director' : 'Academic Head'}</div>
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-hide">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-xs font-semibold transition-colors whitespace-nowrap">
                {l.icon} {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="text-gray-400 text-xs hidden md:block">{profile.name}</span>
            <form action="/auth/signout" method="post">
              <button className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded transition-colors">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
