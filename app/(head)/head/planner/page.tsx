'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PlanRow {
  id: string
  batch_type: string
  subject: string
  class_level: string
  month_name: string
  topic_name: string
  planned_lectures: number
  start_date: string | null
}

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ALL_SUBJECTS = ['Physics','Chemistry','Botany','Zoology','Mathematics','Biology']

// Estimate end date: 1 lecture per working day, Sundays off (Mon–Sat)
function calcEndDate(startDate: string | null, plannedLectures: number): string {
  if (!startDate || !plannedLectures) return '—'
  const d = new Date(startDate)
  let remaining = plannedLectures - 1 // start date itself counts as day 1
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0) remaining-- // skip Sundays (0)
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics:     'bg-blue-100 text-blue-800 border-blue-200',
  Chemistry:   'bg-purple-100 text-purple-800 border-purple-200',
  Botany:      'bg-green-100 text-green-800 border-green-200',
  Zoology:     'bg-teal-100 text-teal-800 border-teal-200',
  Mathematics: 'bg-orange-100 text-orange-800 border-orange-200',
  Biology:     'bg-lime-100 text-lime-800 border-lime-200',
}

interface EditState { id: string; month_name: string; topic_name: string; planned_lectures: number; start_date: string }

interface AddState {
  batch_type: string; subject: string; class_level: string
  month_name: string; topic_name: string; planned_lectures: number; start_date: string
}

export default function PlannerPage() {
  const supabase = createClient()

  const [plans, setPlans]               = useState<PlanRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [activeBatchType, setActiveBatchType] = useState('')
  const [editRow, setEditRow]           = useState<EditState | null>(null)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')

  // Add-chapter modal
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState<AddState>({
    batch_type: '', subject: '', class_level: '', month_name: '', topic_name: '', planned_lectures: 0, start_date: '',
  })
  const [addError, setAddError] = useState('')
  const [adding, setAdding]     = useState(false)

  const loadPlans = useCallback(async () => {
    const { data } = await supabase.from('lecture_plans').select('*')
      .order('batch_type').order('subject').order('month_name')
    const rows = (data ?? []) as PlanRow[]
    setPlans(rows)
    if (!activeBatchType && rows.length > 0) setActiveBatchType(rows[0]!.batch_type)
    setLoading(false)
  }, [activeBatchType]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPlans() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped: Record<string, PlanRow[]> = {}
  for (const p of plans) {
    if (!grouped[p.batch_type]) grouped[p.batch_type] = []
    grouped[p.batch_type]!.push(p)
  }
  const batchTypes = Object.keys(grouped)

  async function saveEdit() {
    if (!editRow) return
    setSaving(true); setSaveError('')
    const res = await fetch('/api/lecture-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editRow.id,
        month_name: editRow.month_name,
        topic_name: editRow.topic_name.trim(),
        planned_lectures: editRow.planned_lectures,
        start_date: editRow.start_date || null,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setSaveError(json.error ?? 'Failed to save'); return }
    setEditRow(null)
    loadPlans()
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this chapter entry?')) return
    await fetch('/api/lecture-plans', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadPlans()
  }

  async function addChapter() {
    if (!addForm.batch_type || !addForm.subject || !addForm.month_name || !addForm.topic_name) {
      setAddError('Fill in all required fields'); return
    }
    setAdding(true); setAddError('')
    const res = await fetch('/api/lecture-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_type: addForm.batch_type,
        subject: addForm.subject,
        class_level: addForm.class_level || '12',
        month_name: addForm.month_name,
        topic_name: addForm.topic_name.trim(),
        planned_lectures: addForm.planned_lectures,
        start_date: addForm.start_date || null,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setAdding(false)
    if (!res.ok) { setAddError(json.error ?? 'Failed to add chapter'); return }
    setShowAdd(false)
    setAddForm({ batch_type: '', subject: '', class_level: '', month_name: '', topic_name: '', planned_lectures: 0, start_date: '' })
    loadPlans()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-9 w-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse" />
      </div>
    )
  }

  const currentPlans = grouped[activeBatchType] ?? []
  const bySubject: Record<string, PlanRow[]> = {}
  for (const p of currentPlans) {
    if (!bySubject[p.subject]) bySubject[p.subject] = []
    bySubject[p.subject]!.push(p)
  }

  const monthTotals: Record<string, Record<string, number>> = {}
  for (const p of currentPlans) {
    if (!monthTotals[p.subject]) monthTotals[p.subject] = {}
    monthTotals[p.subject]![p.month_name] = (monthTotals[p.subject]![p.month_name] ?? 0) + p.planned_lectures
  }

  const usedMonths = Array.from(new Set(currentPlans.map(p => p.month_name))).sort(
    (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">📅 Lecture Planner</h1>
          <p className="text-gray-500 text-base mt-1">Planned lectures per month — click any row to edit.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(''); setAddForm(f => ({ ...f, batch_type: activeBatchType })) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}
        >
          ➕ Add Chapter
        </button>
      </div>

      {/* Batch type tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {batchTypes.map(bt => (
          <button key={bt} onClick={() => { setActiveBatchType(bt); setEditRow(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeBatchType === bt
                ? 'text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
            }`}
            style={activeBatchType === bt ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}
          >
            {bt}
          </button>
        ))}
      </div>

      {/* Monthly summary table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
          <h2 className="font-black text-gray-900">Monthly Lecture Counts — {activeBatchType}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-bold text-gray-500 text-xs uppercase tracking-wide sticky left-0 bg-gray-50 min-w-[120px]">Subject</th>
                {usedMonths.map(m => (
                  <th key={m} className="px-3 py-3 text-center font-bold text-gray-500 text-xs uppercase tracking-wide min-w-[52px]">{m}</th>
                ))}
                <th className="px-5 py-3 text-center font-bold text-gray-500 text-xs uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthTotals).map(([subject, monthData]) => {
                const total = Object.values(monthData).reduce((s, v) => s + v, 0)
                const cc = SUBJECT_COLORS[subject] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                return (
                  <tr key={subject} className="border-b border-gray-100 last:border-0 hover:bg-violet-50/20 transition-colors">
                    <td className="px-5 py-3 sticky left-0 bg-white">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cc}`}>{subject}</span>
                    </td>
                    {usedMonths.map(m => (
                      <td key={m} className="px-3 py-3 text-center">
                        {monthData[m] ? <span className="font-black text-gray-900">{monthData[m]}</span> : <span className="text-gray-200">—</span>}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-center font-black text-violet-700 text-base">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed topic list per subject */}
      {Object.entries(bySubject).map(([subject, items]) => {
        const cc = SUBJECT_COLORS[subject] ?? 'bg-gray-100 text-gray-700 border-gray-200'
        const sorted = [...items].sort((a, b) => MONTH_ORDER.indexOf(a.month_name) - MONTH_ORDER.indexOf(b.month_name))
        return (
          <div key={subject} className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4 shadow-sm card-lift">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cc}`}>{subject}</span>
                <h3 className="font-black text-gray-900">Detailed Plan</h3>
              </div>
              <span className="text-xs text-gray-400 font-semibold">{sorted.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/40 border-b border-gray-100 text-left">
                    <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide w-16">Month</th>
                    <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Topic</th>
                    <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide text-center w-24">Lectures</th>
                    <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide w-32">Start Date</th>
                    <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide w-32">
                      Est. End <span className="normal-case font-normal text-gray-400">(Sun off)</span>
                    </th>
                    <th className="px-5 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(p => {
                    const isEditing = editRow?.id === p.id
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 last:border-0 transition-colors ${isEditing ? 'bg-violet-50' : 'hover:bg-gray-50/60'}`}>
                        {isEditing ? (
                          <>
                            <td className="px-2 py-2">
                              <select value={editRow.month_name}
                                onChange={e => setEditRow(r => r ? { ...r, month_name: e.target.value } : r)}
                                className="w-full px-2 py-1.5 border border-violet-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                              >
                                {MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <input type="text" value={editRow.topic_name}
                                onChange={e => setEditRow(r => r ? { ...r, topic_name: e.target.value } : r)}
                                className="w-full px-3 py-1.5 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" min={0} max={99} value={editRow.planned_lectures}
                                onChange={e => setEditRow(r => r ? { ...r, planned_lectures: parseInt(e.target.value) || 0 } : r)}
                                className="w-16 text-center px-2 py-1.5 border border-violet-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input type="date" value={editRow.start_date}
                                onChange={e => setEditRow(r => r ? { ...r, start_date: e.target.value } : r)}
                                className="w-full px-2 py-1.5 border border-violet-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-xs text-violet-500 font-semibold">
                              {editRow.start_date ? calcEndDate(editRow.start_date, editRow.planned_lectures) : '—'}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                <button onClick={saveEdit} disabled={saving}
                                  className="px-3 py-1.5 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                                  style={{ background: '#7C3AED' }}>
                                  {saving ? '…' : 'Save'}
                                </button>
                                <button onClick={() => { setEditRow(null); setSaveError('') }}
                                  className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200">
                                  ✕
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3 font-bold text-gray-700 text-xs">{p.month_name}</td>
                            <td className="px-5 py-3 text-gray-700 font-medium">{p.topic_name}</td>
                            <td className="px-5 py-3 text-center font-black text-gray-900 text-base">{p.planned_lectures}</td>
                            <td className="px-5 py-3 text-gray-400 text-xs font-semibold">
                              {p.start_date
                                ? new Date(p.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                : '—'}
                            </td>
                            <td className="px-5 py-3 text-xs font-semibold">
                              {p.start_date
                                ? <span className="text-violet-600">{calcEndDate(p.start_date, p.planned_lectures)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setEditRow({ id: p.id, month_name: p.month_name, topic_name: p.topic_name, planned_lectures: p.planned_lectures, start_date: p.start_date ?? '' })}
                                  className="px-2.5 py-1 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-violet-100 hover:text-violet-700 transition-colors"
                                >
                                  Edit
                                </button>
                                <button onClick={() => deleteRow(p.id)}
                                  className="px-2 py-1 text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  ✕
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {saveError && editRow && items.some(i => i.id === editRow.id) && (
              <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-xs text-red-700">{saveError}</div>
            )}
          </div>
        )
      })}

      {/* ── Add Chapter Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">➕ Add Chapter</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-sm">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Batch Type</label>
                  <input type="text" value={addForm.batch_type} onChange={e => setAddForm(f => ({ ...f, batch_type: e.target.value }))}
                    placeholder="e.g. NEET Excel"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Class</label>
                  <input type="text" value={addForm.class_level} onChange={e => setAddForm(f => ({ ...f, class_level: e.target.value }))}
                    placeholder="11 or 12"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Subject</label>
                  <select value={addForm.subject} onChange={e => setAddForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Select…</option>
                    {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Month</label>
                  <select value={addForm.month_name} onChange={e => setAddForm(f => ({ ...f, month_name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Select…</option>
                    {MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Topic / Chapter Name</label>
                <input type="text" value={addForm.topic_name} onChange={e => setAddForm(f => ({ ...f, topic_name: e.target.value }))}
                  placeholder="e.g. [PHY] Kinematics"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Planned Lectures</label>
                  <input type="number" min={0} max={99} value={addForm.planned_lectures}
                    onChange={e => setAddForm(f => ({ ...f, planned_lectures: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Start Date <span className="text-gray-400 font-normal">(opt)</span></label>
                  <input type="date" value={addForm.start_date} onChange={e => setAddForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {addError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={addChapter} disabled={adding}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}>
                {adding ? 'Adding…' : 'Add Chapter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
