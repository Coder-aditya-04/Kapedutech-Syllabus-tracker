'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Center { id: string; name: string }

export function CenterFilter() {
  const [centers, setCenters] = useState<Center[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = searchParams.get('center') ?? 'all'

  useEffect(() => {
    createClient()
      .from('centers')
      .select('id, name')
      .order('name')
      .then(({ data }) => setCenters((data ?? []) as Center[]))
  }, [])

  function pick(centerId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (centerId === 'all') params.delete('center')
    else params.set('center', centerId)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (centers.length === 0) return null

  const pills = [{ id: 'all', name: 'All Centers' }, ...centers]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Center</span>
      {pills.map(c => {
        const active = c.id === selected
        return (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              active
                ? 'text-white border-transparent shadow-sm'
                : 'text-gray-500 border-gray-200 bg-white hover:border-violet-300 hover:text-violet-600'
            }`}
            style={active ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)', border: 'none' } : {}}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
