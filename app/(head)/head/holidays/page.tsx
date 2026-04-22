'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CenterBadge } from '@/components/shared/CenterBadge'

interface Holiday {
  id: string
  holiday_date: string
  holiday_name: string
  affects_all_centers: boolean
  centers: { name: string } | null
}

export default function HolidaysPage() {
  const supabase = createClient()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [allCenters, setAllCenters] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadHolidays() }, [])

  async function loadHolidays() {
    const { data } = await supabase
      .from('holidays')
      .select('id, holiday_date, holiday_name, affects_all_centers, centers(name)')
      .order('holiday_date', { ascending: false })
    setHolidays((data as unknown as Holiday[]) ?? [])
    setLoading(false)
  }

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase.from('holidays') as any).insert({
      holiday_date: date, holiday_name: name, affects_all_centers: allCenters,
    })
    setSaving(false)
    if (dbError) { setError(dbError.message); return }
    setDate(''); setName('')
    loadHolidays()
  }

  async function deleteHoliday(id: string) {
    await supabase.from('holidays').delete().eq('id', id)
    loadHolidays()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">🗓️ Holiday Planner</h1>
        <p className="text-gray-500 text-base mt-1">Mark holidays — teachers see these when submitting logs</p>
      </div>

      {/* Add holiday form */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6 card-lift">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
          <h2 className="text-base font-black text-gray-900">➕ Add Holiday</h2>
        </div>
        <div className="p-6">
          <form onSubmit={addHoliday} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
                <input
                  type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Holiday Name</label>
                <input
                  value={name} onChange={e => setName(e.target.value)} placeholder="Diwali, Independence Day…" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={allCenters} onChange={e => setAllCenters(e.target.checked)} className="w-4 h-4 accent-violet-600" />
              <span className="text-sm font-semibold text-gray-700">Affects both centers</span>
            </label>
            {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</div>}
            <button
              type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}
            >
              {saving ? 'Adding…' : 'Add Holiday'}
            </button>
          </form>
        </div>
      </div>

      {/* Holiday list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f1f5f9)' }}>
          <h2 className="text-base font-black text-gray-900">📅 Upcoming & Recent Holidays</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 font-medium">Loading…</div>
        ) : holidays.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-500 font-semibold">No holidays added yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {holidays.map(h => (
              <div key={h.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors">
                <div>
                  <div className="font-bold text-gray-900">{h.holiday_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500 font-semibold">
                      {new Date(h.holiday_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {h.affects_all_centers ? (
                      <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full font-bold">Both Centers</span>
                    ) : h.centers ? (
                      <CenterBadge name={h.centers.name} />
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => deleteHoliday(h.id)}
                  className="text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
