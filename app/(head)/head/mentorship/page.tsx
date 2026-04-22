'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Teacher { id: string; name: string; employee_id: string | null }
interface BatchInfo { id: string; name: string; batch_type: string; class_level: string; centers: { name: string } | null }
interface MentorshipRow {
  id: string; notes: string | null; assigned_at: string; is_active: boolean
  user_profiles: { name: string; employee_id: string | null } | null
  batches: BatchInfo | null
}

const BATCH_TYPE_COLORS: Record<string, string> = {
  NEET_EXCEL:  'bg-purple-100 text-purple-800',
  NEET_GROWTH: 'bg-purple-50 text-purple-700',
  JEE_EXCEL:   'bg-blue-100 text-blue-800',
  JEE_GROWTH:  'bg-blue-50 text-blue-700',
  MHT_CET:     'bg-slate-100 text-slate-700',
}

export default function MentorshipPage() {
  const supabase = createClient()

  const [mentorships, setMentorships] = useState<MentorshipRow[]>([])
  const [batches, setBatches]         = useState<BatchInfo[]>([])
  const [teachers, setTeachers]       = useState<Teacher[]>([])
  const [loading, setLoading]         = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [selBatch, setSelBatch]   = useState('')
  const [selTeacher, setSelTeacher] = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    const [{ data: m }, { data: b }, { data: t }] = await Promise.all([
      supabase.from('mentorships')
        .select('id, notes, assigned_at, is_active, user_profiles(name, employee_id), batches(id, name, batch_type, class_level, centers(name))')
        .eq('is_active', true).order('assigned_at', { ascending: false }),
      supabase.from('batches').select('id, name, batch_type, class_level, centers(name)').eq('is_active', true).order('name'),
      supabase.from('user_profiles').select('id, name, employee_id').eq('role', 'teacher').order('name'),
    ])
    setMentorships((m ?? []) as unknown as MentorshipRow[])
    setBatches((b ?? []) as unknown as BatchInfo[])
    setTeachers((t ?? []) as Teacher[])
    setLoading(false)
  }, []) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const assignedBatchIds = new Set(mentorships.map(m => m.batches?.id).filter(Boolean))
  const unassigned = batches.filter(b => !assignedBatchIds.has(b.id))

  async function handleAssign() {
    if (!selBatch || !selTeacher) { setFormError('Select both a batch and a teacher.'); return }
    setSaving(true); setFormError('')
    const { error } = await supabase.from('mentorships').insert({
      batch_id: selBatch, mentor_teacher_id: selTeacher, notes: notes || null, is_active: true,
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowModal(false); setSelBatch(''); setSelTeacher(''); setNotes('')
    load()
  }

  async function removeMentorship(id: string) {
    await supabase.from('mentorships').update({ is_active: false }).eq('id', id)
    load()
  }

  if (loading) return (
    <div className="space-y-3">
      <div className="h-10 w-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤝 Mentorship</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {mentorships.length} active · {unassigned.length} batches without mentor
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError('') }}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors hover:opacity-90"
          style={{ background: '#1A73E8' }}
        >
          + Assign Mentor
        </button>
      </div>

      {/* Active mentorships */}
      {mentorships.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center mb-6">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-gray-500 font-medium">No mentorships assigned yet</p>
          <p className="text-gray-400 text-sm mt-1">Click &ldquo;Assign Mentor&rdquo; to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8 stagger">
          {mentorships.map(m => {
            const mentor = m.user_profiles
            const batch  = m.batches
            const color  = BATCH_TYPE_COLORS[batch?.batch_type ?? ''] ?? 'bg-gray-100 text-gray-700'
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-5 card-lift animate-fade-up">
                {/* Batch */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{batch?.name ?? 'Unknown'}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {batch?.centers?.name} · Class {batch?.class_level}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${color}`}>
                    {batch?.batch_type?.replace(/_/g,' ')}
                  </span>
                </div>

                {/* Mentor */}
                <div className="flex items-center gap-3 py-3 border-y border-gray-100">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: '#1A73E8' }}>
                    {mentor?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{mentor?.name}</p>
                    {mentor?.employee_id && <p className="text-xs text-gray-400">{mentor.employee_id}</p>}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#E8F5E9', color: '#43A047' }}>
                    Mentor
                  </span>
                </div>

                {m.notes && (
                  <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                    💬 {m.notes}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">
                    📅 Assigned {new Date(m.assigned_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </p>
                  <button
                    onClick={() => removeMentorship(m.id)}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Batches without mentor */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-sm">⚠️ Batches Without Mentor ({unassigned.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {unassigned.map(b => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.centers?.name} · Class {b.class_level}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${BATCH_TYPE_COLORS[b.batch_type] ?? 'bg-gray-100 text-gray-700'}`}>
                  {b.batch_type.replace(/_/g,' ')}
                </span>
                <button
                  onClick={() => { setSelBatch(b.id); setShowModal(true); setFormError('') }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 shrink-0"
                  style={{ background: '#1A73E8' }}
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">🤝 Assign Mentor</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">🏫 Batch</label>
                <select value={selBatch} onChange={e => setSelBatch(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
                >
                  <option value="">— Select batch —</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.centers?.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">👨‍🏫 Mentor Teacher</label>
                <select value={selTeacher} onChange={e => setSelTeacher(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
                >
                  <option value="">— Select teacher —</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.employee_id ? ` (${t.employee_id})` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  💬 Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any notes about this mentorship…"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none"
                />
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50"
              >Cancel</button>
              <button onClick={handleAssign} disabled={saving}
                className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                style={{ background: '#1A73E8' }}
              >
                {saving ? 'Assigning…' : 'Assign Mentor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
