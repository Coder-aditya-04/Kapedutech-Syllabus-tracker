'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────
interface SlotRow {
  id: string
  week_start: string
  batch_id: string
  date: string
  slot_index: number
  teacher_id: string | null
  subject: string
  is_override: boolean
  is_sunday_extra: boolean
}

interface Batch {
  id: string
  name: string
  batch_type: string
  time_slot: string
  slots_per_day: number
  center_name: string
}

interface Teacher {
  id: string
  name: string
  teacher_code: string | null
  subject: string // from assignment
}

interface Absence {
  id: string
  teacher_id: string
  week_start: string
  day_name: string
  slot_index: number
}

interface OffDay {
  batch_id: string
  day_name: string
}

interface Props {
  weekStart: string
  schedule: SlotRow[]
  batches: Batch[]
  teachers: Teacher[] // all teachers for override dropdown
  offDays: OffDay[]
  includeSunday: boolean
  clashBatchIds: string[] // batch IDs with clashes
}

// ── Subject config ─────────────────────────────────────────────────────────
const SUBJECT_COLOR: Record<string, string> = {
  Physics:   'bg-blue-100 text-blue-800 border-blue-200',
  Chemistry: 'bg-green-100 text-green-800 border-green-200',
  Maths:     'bg-violet-100 text-violet-800 border-violet-200',
  Botany:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  Zoology:   'bg-teal-100 text-teal-800 border-teal-200',
  Biology:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  English:   'bg-orange-100 text-orange-800 border-orange-200',
  SST:       'bg-yellow-100 text-yellow-800 border-yellow-200',
  MAT:       'bg-pink-100 text-pink-800 border-pink-200',
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SLOT_TIMES: Record<string, string[]> = {
  Morning:   ['08:15–09:30', '09:40–10:55', '11:05–12:20'],
  Afternoon: ['13:00–14:15', '14:25–15:40', '15:50–17:05'],
  Evening:   ['17:30–18:45', '18:55–20:10'],
}

function subjectShort(s: string) {
  const map: Record<string, string> = {
    Physics: 'PHY', Chemistry: 'CHE', Maths: 'MAT', Botany: 'BOT',
    Zoology: 'ZOO', Biology: 'BIO', English: 'ENG', SST: 'SST', MAT: 'MAT',
  }
  return map[s] ?? s.slice(0, 3).toUpperCase()
}

// ── Generate Button ────────────────────────────────────────────────────────
function GenerateButton({ weekStart, includeSunday }: { weekStart: string; includeSunday: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState('')

  async function generate() {
    setState('loading')
    try {
      const res = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, includeSunday }),
      })
      const json = await res.json()
      if (res.ok) {
        setMsg(`✅ Generated ${json.cells} slots${json.clashes ? ` · ⚠️ ${json.clashes} clashes` : ''}`)
        setState('ok')
        router.refresh()
      } else {
        setMsg(json.error ?? 'Failed')
        setState('err')
      }
    } catch {
      setMsg('Network error')
      setState('err')
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={generate}
        disabled={state === 'loading'}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90 disabled:opacity-50 disabled:scale-100"
        style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}
      >
        {state === 'loading' ? '⚙️ Generating…' : '⚡ Generate Schedule'}
      </button>
      {msg && (
        <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${state === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </span>
      )}
    </div>
  )
}

// ── Absence Manager ────────────────────────────────────────────────────────
function AbsenceManager({ weekStart, absences, teachers }: {
  weekStart: string
  absences: Absence[]
  teachers: Teacher[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [teacherId, setTeacherId] = useState('')
  const [dayName, setDayName] = useState('Monday')
  const [slotIndex, setSlotIndex] = useState(-1)
  const [saving, setSaving] = useState(false)

  const uniqueTeachers = teachers.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)

  async function addAbsence() {
    if (!teacherId) return
    setSaving(true)
    await fetch('/api/teacher-absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, teacherId, dayName, slotIndex }),
    })
    setSaving(false)
    router.refresh()
  }

  async function removeAbsence(id: string) {
    await fetch('/api/teacher-absences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition">
        🤒 Absences {absences.length > 0 && <span className="bg-red-100 text-red-700 rounded-full px-2 text-xs font-black">{absences.length}</span>}
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-4">
          <div className="font-black text-gray-900 mb-3">Mark Teacher Absent</div>

          <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2">
            <option value="">Select teacher…</option>
            {uniqueTeachers.map(t => (
              <option key={t.id} value={t.id}>{t.teacher_code ?? ''} {t.name}</option>
            ))}
          </select>

          <div className="flex gap-2 mb-2">
            <select value={dayName} onChange={e => setDayName(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {DAYS.slice(0, 6).map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={slotIndex} onChange={e => setSlotIndex(Number(e.target.value))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value={-1}>All day</option>
              <option value={0}>Slot 1</option>
              <option value={1}>Slot 2</option>
              <option value={2}>Slot 3</option>
            </select>
          </div>

          <button onClick={addAbsence} disabled={saving || !teacherId}
            className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 mb-3">
            {saving ? 'Saving…' : 'Mark Absent'}
          </button>

          {absences.length > 0 && (
            <div className="space-y-1">
              {absences.map(a => {
                const t = uniqueTeachers.find(x => x.id === a.teacher_id)
                return (
                  <div key={a.id} className="flex items-center justify-between text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                    <span className="font-semibold text-red-800">
                      {t?.teacher_code ?? t?.name ?? '?'} — {a.day_name} {a.slot_index === -1 ? '(all day)' : `Slot ${a.slot_index + 1}`}
                    </span>
                    <button onClick={() => removeAbsence(a.id)} className="text-red-400 hover:text-red-700 ml-2">✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Cell Override Modal ────────────────────────────────────────────────────
function CellOverrideModal({ cell, batchName, weekStart, teachers, onClose, onSaved }: {
  cell: SlotRow
  batchName: string
  weekStart: string
  teachers: Teacher[]
  onClose: () => void
  onSaved: () => void
}) {
  const [teacherId, setTeacherId] = useState(cell.teacher_id ?? '')
  const [subject, setSubject] = useState(cell.subject)
  const [saving, setSaving] = useState(false)

  const uniqueTeachers = teachers.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)

  async function save() {
    setSaving(true)
    await fetch('/api/schedule-override', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart,
        batchId: cell.batch_id,
        date: cell.date,
        slotIndex: cell.slot_index,
        teacherId: teacherId || null,
        subject,
      }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  const SUBJECTS = ['Physics', 'Chemistry', 'Maths', 'Botany', 'Zoology', 'Biology', 'English', 'SST', 'MAT']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <div className="font-black text-gray-900 mb-1">Override Cell</div>
        <div className="text-xs text-gray-400 mb-4">{batchName} · {new Date(cell.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} · Slot {cell.slot_index + 1}</div>

        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3">
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>

        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Teacher</label>
        <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4">
          <option value="">No teacher / Free</option>
          {uniqueTeachers.map(t => (
            <option key={t.id} value={t.id}>{t.teacher_code ?? ''} {t.name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Override'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
        {cell.is_override && (
          <button onClick={async () => {
            await fetch('/api/schedule-override', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weekStart, batchId: cell.batch_id, date: cell.date, slotIndex: cell.slot_index }),
            })
            onSaved(); onClose()
          }} className="w-full mt-2 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50">
            Remove Override
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Grid ──────────────────────────────────────────────────────────────
export function ScheduleGrid({ weekStart, schedule, batches, teachers, offDays, includeSunday, clashBatchIds }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editCell, setEditCell] = useState<SlotRow | null>(null)
  const [sundayOn, setSundayOn] = useState(includeSunday)
  const [center, setCenter] = useState('All')
  const [togglingOffDay, setTogglingOffDay] = useState<string | null>(null)

  function refresh() {
    startTransition(() => router.refresh())
  }

  const days = DAYS.slice(0, sundayOn ? 7 : 6)
  const centers = ['All', ...Array.from(new Set(batches.map(b => b.center_name)))]
  const visibleBatches = batches.filter(b => center === 'All' || b.center_name === center)
  const grouped = visibleBatches.reduce<Record<string, Batch[]>>((acc, b) => {
    const g = b.time_slot ?? 'Morning'
    if (!acc[g]) acc[g] = []
    acc[g].push(b)
    return acc
  }, {})

  function getCell(batchId: string, date: string, slotIdx: number) {
    return schedule.find(s => s.batch_id === batchId && s.date === date && s.slot_index === slotIdx)
  }

  function getDate(weekStart: string, dayIndex: number) {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + dayIndex)
    return d.toISOString().split('T')[0]
  }

  async function toggleOffDay(batchId: string, dayName: string) {
    const key = `${batchId}-${dayName}`
    setTogglingOffDay(key)
    const existing = offDays.find(o => o.batch_id === batchId && o.day_name === dayName)
    await fetch('/api/batch-offdays', {
      method: existing ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart, batchId, dayName }),
    })
    setTogglingOffDay(null)
    refresh()
  }

  const isOffDay = (batchId: string, dayName: string) =>
    offDays.some(o => o.batch_id === batchId && o.day_name === dayName)

  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {centers.map(c => (
          <button key={c} onClick={() => setCenter(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${center === c ? 'bg-violet-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {c}
          </button>
        ))}
        <div className="flex-1" />
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div onClick={() => setSundayOn(p => !p)}
            className={`w-10 h-5 rounded-full transition-colors ${sundayOn ? 'bg-violet-600' : 'bg-gray-200'} relative`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sundayOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-semibold text-gray-600">Sunday Lecture</span>
        </label>
      </div>

      {Object.keys(grouped).sort().map(timeSlot => (
        <div key={timeSlot} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{timeSlot}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {grouped[timeSlot].map(batch => {
            const slotsPerDay = batch.slots_per_day ?? 3
            const slotTimes = SLOT_TIMES[batch.time_slot ?? 'Morning'] ?? []
            const hasClash = clashBatchIds.includes(batch.id)

            return (
              <div key={batch.id} className="mb-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Batch header */}
                <div className={`flex items-center gap-3 px-4 py-2.5 ${hasClash ? 'bg-red-50 border-b border-red-100' : 'bg-gray-50 border-b border-gray-100'}`}>
                  <span className="font-black text-gray-900 text-sm">{batch.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    batch.batch_type === 'JEE' ? 'bg-blue-100 text-blue-700' :
                    batch.batch_type === 'NEET' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>{batch.batch_type}</span>
                  {hasClash && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">⚠️ Clash</span>}
                </div>

                {/* Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-3 py-2 text-gray-400 font-semibold w-24">Slot</th>
                        {days.map((dayName, di) => {
                          const off = isOffDay(batch.id, dayName)
                          const key = `${batch.id}-${dayName}`
                          return (
                            <th key={dayName} className="px-2 py-2 text-center min-w-[90px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`font-black ${di === 6 ? 'text-orange-600' : 'text-gray-700'}`}>
                                  {DAY_SHORT[di]}
                                </span>
                                <button
                                  onClick={() => toggleOffDay(batch.id, dayName)}
                                  disabled={togglingOffDay === key}
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${off ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                  {off ? 'OFF' : 'On'}
                                </button>
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: slotsPerDay }, (_, slotIdx) => (
                        <tr key={slotIdx} className="border-b border-gray-50 last:border-0">
                          <td className="px-3 py-2 text-gray-400 font-semibold whitespace-nowrap">
                            <div>Slot {slotIdx + 1}</div>
                            {slotTimes[slotIdx] && <div className="text-[10px] text-gray-300">{slotTimes[slotIdx]}</div>}
                          </td>
                          {days.map((dayName, di) => {
                            const date = getDate(weekStart, di)
                            const off = isOffDay(batch.id, dayName)
                            const cell = getCell(batch.id, date, slotIdx)

                            if (off) {
                              return (
                                <td key={dayName} className="px-2 py-2 text-center">
                                  <div className="rounded-lg bg-gray-50 text-gray-300 text-[10px] py-2 font-semibold">—</div>
                                </td>
                              )
                            }

                            if (!cell) {
                              return (
                                <td key={dayName} className="px-2 py-2 text-center">
                                  <div className="rounded-lg border border-dashed border-gray-200 text-gray-300 text-[10px] py-2">Empty</div>
                                </td>
                              )
                            }

                            const colorClass = SUBJECT_COLOR[cell.subject] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                            const teacherObj = teachers.find(t => t.id === cell.teacher_id)
                            const code = teacherObj?.teacher_code ?? teacherObj?.name?.slice(0, 2).toUpperCase() ?? '?'

                            return (
                              <td key={dayName} className="px-2 py-1.5 text-center">
                                <button
                                  onClick={() => setEditCell(cell)}
                                  className={`w-full rounded-lg border px-2 py-1.5 font-black text-center transition-all hover:scale-105 hover:shadow-sm ${colorClass} ${cell.is_override ? 'ring-2 ring-amber-400' : ''}`}
                                >
                                  <div className="text-[11px] leading-tight">{code}</div>
                                  <div className="text-[10px] opacity-70 font-semibold">{subjectShort(cell.subject)}</div>
                                  {cell.is_override && <div className="text-[9px] text-amber-600">✏️ Override</div>}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {visibleBatches.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-bold text-lg">No batches found</div>
          <div className="text-sm mt-1">Add batches and set their time slot to see the timetable</div>
        </div>
      )}

      {/* Override modal */}
      {editCell && (
        <CellOverrideModal
          cell={editCell}
          batchName={batches.find(b => b.id === editCell.batch_id)?.name ?? ''}
          weekStart={weekStart}
          teachers={teachers}
          onClose={() => setEditCell(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

// Export helpers for page
export { GenerateButton, AbsenceManager }
