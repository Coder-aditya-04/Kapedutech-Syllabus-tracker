'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BATCH_TYPES, CLASS_LEVELS, ACADEMIC_YEAR } from '@/lib/constants'

interface Center {
  id: string
  name: string
}

interface BatchRow {
  id: string
  name: string
  batch_type: string
  class_level: string
  is_active: boolean
  academic_year: string
  center_id: string
  centers: { name: string } | null
  teacher_batch_assignments: Array<{
    id: string
    subject: string
    is_active: boolean
    user_profiles: { name: string } | null
  }>
}

const BATCH_TYPE_LABELS: Record<string, string> = {
  NEET_EXCEL:  'NEET Excel',
  NEET_GROWTH: 'NEET Growth',
  JEE_EXCEL:   'JEE Excel',
  JEE_GROWTH:  'JEE Growth',
  MHT_CET:     'MHT-CET',
}

const BATCH_TYPE_COLORS: Record<string, string> = {
  NEET_EXCEL:  'bg-purple-100 text-purple-800 border-purple-200',
  NEET_GROWTH: 'bg-purple-50 text-purple-700 border-purple-200',
  JEE_EXCEL:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  JEE_GROWTH:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  MHT_CET:     'bg-slate-100 text-slate-700 border-slate-200',
}

interface FormState {
  name: string
  center_id: string
  batch_type: string
  class_level: string
  academic_year: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  center_id: '',
  batch_type: 'NEET_EXCEL',
  class_level: '11',
  academic_year: ACADEMIC_YEAR,
  is_active: true,
}

export default function BatchesPage() {
  const supabase = createClient()

  const [batches, setBatches] = useState<BatchRow[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [centerFilter, setCenterFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBatch, setEditBatch] = useState<BatchRow | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadData = useCallback(async () => {
    const [{ data: batchData }, { data: centerData }] = await Promise.all([
      supabase
        .from('batches')
        .select('id, name, batch_type, class_level, is_active, academic_year, center_id, centers(name), teacher_batch_assignments(id, subject, is_active, user_profiles(name))')
        .order('name'),
      supabase.from('centers').select('id, name').order('name'),
    ])
    setBatches((batchData ?? []) as unknown as BatchRow[])
    setCenters((centerData ?? []) as Center[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  function openCreate() {
    setEditBatch(null)
    setForm({ ...EMPTY_FORM, center_id: centers[0]?.id ?? '' })
    setFormError('')
    setShowModal(true)
  }

  function openEdit(batch: BatchRow) {
    setEditBatch(batch)
    setForm({
      name: batch.name,
      center_id: batch.center_id,
      batch_type: batch.batch_type,
      class_level: batch.class_level,
      academic_year: batch.academic_year,
      is_active: batch.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Batch name is required.'); return }
    if (!form.center_id) { setFormError('Please select a center.'); return }
    setSaving(true)
    setFormError('')

    if (editBatch) {
      const { error } = await supabase
        .from('batches')
        .update({
          name: form.name.trim(),
          center_id: form.center_id,
          batch_type: form.batch_type,
          class_level: form.class_level,
          academic_year: form.academic_year,
          is_active: form.is_active,
        })
        .eq('id', editBatch.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('batches').insert({
        name: form.name.trim(),
        center_id: form.center_id,
        batch_type: form.batch_type,
        class_level: form.class_level,
        academic_year: form.academic_year,
        is_active: form.is_active,
      })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setShowModal(false)
    loadData()
  }

  async function toggleActive(batch: BatchRow) {
    await supabase.from('batches').update({ is_active: !batch.is_active }).eq('id', batch.id)
    loadData()
  }

  const filtered = centerFilter === 'all' ? batches : batches.filter(b => b.center_id === centerFilter)
  const active   = filtered.filter(b => b.is_active)
  const inactive = filtered.filter(b => !b.is_active)

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{active.length} active · {inactive.length} inactive</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          New Batch
        </button>
      </div>

      {/* Center filter */}
      {centers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Center</span>
          {[{ id: 'all', name: 'All Centers' }, ...centers].map(c => {
            const isActive = c.id === centerFilter
            return (
              <button
                key={c.id}
                onClick={() => setCenterFilter(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isActive
                    ? 'text-white border-transparent shadow-sm'
                    : 'text-gray-500 border-gray-200 bg-white hover:border-violet-300 hover:text-violet-600'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)', border: 'none' } : {}}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Batches grid */}
      {batches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <p className="font-medium">No batches yet</p>
          <p className="text-sm mt-1">Click &ldquo;New Batch&rdquo; to create one</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {batches.map(batch => {
            const activeAssign = (batch.teacher_batch_assignments ?? []).filter(a => a.is_active)
            const colorClass = BATCH_TYPE_COLORS[batch.batch_type] ?? 'bg-gray-100 text-gray-700 border-gray-200'
            return (
              <div
                key={batch.id}
                className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-opacity ${!batch.is_active ? 'opacity-60 border-gray-200' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{batch.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{batch.centers?.name} · {batch.academic_year}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${colorClass}`}>
                    {BATCH_TYPE_LABELS[batch.batch_type] ?? batch.batch_type}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    Class {batch.class_level}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${batch.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {batch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Teachers */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Teachers Assigned</p>
                  {activeAssign.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No teachers assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {activeAssign.map(a => (
                        <div key={a.id} className="flex justify-between text-xs">
                          <span className="text-gray-600 font-medium">{a.subject}</span>
                          <span className="text-gray-400">{a.user_profiles?.name ?? 'Unassigned'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-gray-100 mt-auto">
                  <button
                    onClick={() => openEdit(batch)}
                    className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(batch)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      batch.is_active
                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {batch.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editBatch ? 'Edit Batch' : 'New Batch'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. NEET Excel – 2026"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Center */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Center
                </label>
                <select
                  value={form.center_id}
                  onChange={e => setForm(f => ({ ...f, center_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                >
                  <option value="">— Select center —</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Batch type + Class level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Batch Type
                  </label>
                  <select
                    value={form.batch_type}
                    onChange={e => setForm(f => ({ ...f, batch_type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    {BATCH_TYPES.map(t => (
                      <option key={t} value={t}>{BATCH_TYPE_LABELS[t] ?? t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Class
                  </label>
                  <select
                    value={form.class_level}
                    onChange={e => setForm(f => ({ ...f, class_level: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    {CLASS_LEVELS.map(l => (
                      <option key={l} value={l}>Class {l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Academic year */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={form.academic_year}
                  onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  placeholder="2026-27"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Active batch</span>
              </label>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
              >
                {saving ? 'Saving…' : editBatch ? 'Save Changes' : 'Create Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
