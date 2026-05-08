'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NavItem { href: string; label: string }
interface Props {
  nav: NavItem[]
  initials: string
  name: string
  role: string
  accentColor?: string
}

export function MobileNav({ nav, initials, name, role, accentColor = '#7C3AED,#1A73E8' }: Props) {
  const [open, setOpen] = useState(false)

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Open navigation"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect y="3" width="20" height="2" rx="1" fill="currentColor"/>
          <rect y="9" width="20" height="2" rx="1" fill="currentColor"/>
          <rect y="15" width="20" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          />

          {/* Slide-in drawer */}
          <div
            className="absolute right-0 top-0 bottom-0 w-72 flex flex-col"
            style={{ background: 'linear-gradient(180deg, #0f0c1e 0%, #08090A 100%)', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)' }}
          >
            {/* Profile header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0"
                  style={{ background: `linear-gradient(135deg, ${accentColor})` }}
                >
                  {initials}
                </div>
                <div>
                  <div className="text-white text-sm font-bold leading-tight">{name}</div>
                  <div className="text-gray-400 text-[10px] uppercase tracking-widest mt-0.5">{role}</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {nav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 text-[14px] font-semibold transition-colors mb-0.5 active:bg-white/20"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Sign out */}
            <div className="px-4 py-4 border-t border-white/10">
              <form action="/auth/signout" method="post">
                <button className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors text-sm font-semibold">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
