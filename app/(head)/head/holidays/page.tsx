'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  useEffect(() => {
    loadHolidays()
  }, [])

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
    setSaving(true)
    setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase.from('holidays') as any).insert({
      holiday_date: date,
      holiday_name: name,
      affects_all_centers: allCenters,
    })
    setSaving(false)
    if (dbError) { setError(dbError.message); return }
    setDate('')
    setName('')
    loadHolidays()
  }

  async function deleteHoliday(id: string) {
    await supabase.from('holidays').delete().eq('id', id)
    loadHolidays()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Holiday Planner</h1>
        <p className="text-gray-500 text-sm mt-0.5">Mark holidays — teachers see these when submitting logs</p>
      </div>

      {/* Add holiday form */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Add Holiday</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addHoliday} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Holiday Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Diwali, Independence Day…" required />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="allCenters" checked={allCenters} onChange={e => setAllCenters(e.target.checked)} className="w-4 h-4" />
              <Label htmlFor="allCenters" className="cursor-pointer font-normal">Affects both centers</Label>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button type="submit" disabled={saving} style={{ background: '#6929C4' }}>
              {saving ? 'Adding…' : 'Add Holiday'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Holiday list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upcoming & Recent Holidays</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
          ) : holidays.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No holidays added yet</div>
          ) : (
            <div>
              {holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50">
                  <div>
                    <div className="font-semibold text-sm">{h.holiday_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {new Date(h.holiday_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {h.affects_all_centers ? (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Both Centers</span>
                      ) : h.centers ? (
                        <CenterBadge name={h.centers.name} />
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHoliday(h.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
