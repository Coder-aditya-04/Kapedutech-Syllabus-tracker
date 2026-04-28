'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import Link from 'next/link'

interface Teacher {
  id: string; name: string; employee_id: string | null; role: string; center_id: string | null
  centers: { name: string } | null; teacher_code: string | null
}
interface Assignment {
  id: string; subject: string; is_active: boolean
  batches: { id: string; name: string; batch_type: string; centers: { name: string } } | null
}
interface Batch {
  id: string; name: string; batch_type: string; class_level: string
  centers: { name: string }
}

const NEET_SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology']
const JEE_SUBJECTS  = ['Physics', 'Chemistry', 'Mathematics']

export default function TeacherEditPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [teacher, setTeacher]         = useState<Teacher | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [addBatchId, setAddBatchId]   = useState('')
  const [addSubject, setAddSubject]   = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [editingCode, setEditingCode] = useState(false)
  const [codeInput, setCodeInput]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [tRes, aRes, bRes] = await Promise.all([
      supabase.from('user_profiles').select('id, name, employee_id, role, center_id, teacher_code, centers(name)').eq('id', id).single(),
      supabase.from('teacher_batch_assignments').select('id, subject, is_active, batches(id, name, batch_type, centers(name))').eq('teacher_id', id).order('is_active', { ascending: false }),
      supabase.from('batches').select('id, name, batch_type, class_level, centers(name)').eq('is_active', true).order('name'),
    ])
    setTeacher(tRes.data as unknown as Teacher)
    setAssignments(aRes.data as unknown as Assignment[])
    setBatches(bRes.data as unknown as Batch[])
    setLoading(false)
  }, [id]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const selectedBatch      = batches.find(b => b.id === addBatchId)
  const availableSubjects  = selectedBatch
    ? (selectedBatch.batch_type.startsWith('NEET') ? NEET_SUBJECTS : JEE_SUBJECTS)
    : []

  async function addAssignment() {
    if (!addBatchId || !addSubject) { setError('Select a batch and subject'); return }
    setSaving(true); setError('')
    const existing = assignments.find(a => a.batches?.id === addBatchId && a.subject === addSubject)
    if (existing) {
      if (!existing.is_active) {
        await supabase.from('teacher_batch_assignments').update({ is_active: true }).eq('id', existing.id)
      } else {
        setError('This assignment already exists'); setSaving(false); return
      }
    } else {
      await (supabase.from('teacher_batch_assignments') as unknown as { insert: (v: object) => Promise<{ error: Error | null }> })
        .insert({ teacher_id: id, batch_id: addBatchId, subject: addSubject, is_active: true })
    }
    setAddBatchId(''); setAddSubject('')
    await load(); setSaving(false)
  }

  async function toggleAssignment(assignmentId: string, currentActive: boolean) {
    setSaving(true)
    await supabase.from('teacher_batch_assignments').update({ is_active: !currentActive }).eq('id', assignmentId)
    await load(); setSaving(false)
  }

  async function updateRole(newRole: string) {
    setSaving(true)
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', id)
    await load(); setSaving(false)
  }

  async function saveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setSaving(true)
    await supabase.from('user_profiles').update({ name: trimmed }).eq('id', id)
    setEditingName(false)
    await load()
    setSaving(false)
  }

  async function saveCode() {
    setSaving(true)
    await fetch('/api/update-teacher-code', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: id, code: codeInput.trim() }),
    })
    setEditingCode(false)
    await load()
    setSaving(false)
  }

  if (loading) return (
    <div className="max-w-2xl animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded-xl w-64" />
      <div className="h-32 bg-gray-200 rounded-2xl" />
      <div className="h-48 bg-gray-200 rounded-2xl" />
    </div>
  )

  if (!teacher) return (
    <div className="max-w-2xl">
      <p className="text-gray-500">Teacher not found.</p>
      <Link href="/head/teachers" className="text-violet-600 text-sm font-bold mt-2 inline-block">← Back to Teachers</Link>
    </div>
  )

  const activeAssignments   = assignments.filter(a => a.is_active)
  const inactiveAssignments = assignments.filter(a => !a.is_active)
  const initials = teacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/head/teachers" className="text-gray-400 hover:text-violet-600 font-semibold transition-colors">👨‍🏫 Teachers</Link>
        <span className="text-gray-300">/</span>
        <span className="font-bold text-gray-900">{teacher.name}</span>
      </div>

      {/* Teacher profile card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5 card-lift">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}>
            {initials}
          </div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="text-base font-black text-gray-900 border-b-2 border-violet-500 bg-transparent outline-none w-40"
                />
                <button onClick={saveName} disabled={saving}
                  className="text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1 rounded-lg disabled:opacity-50">
                  Save
                </button>
                <button onClick={() => setEditingName(false)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-lg font-black text-gray-900">{teacher.name}</h2>
                <button
                  onClick={() => { setNameInput(teacher.name); setEditingName(true) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-violet-600 transition-all p-1 rounded"
                  title="Edit name"
                >
                  ✏️
                </button>
              </div>
            )}
            {teacher.employee_id && <p className="text-xs text-gray-500 font-semibold">{teacher.employee_id}</p>}
            {/* Timetable code */}
            <div className="flex items-center gap-2 mt-1 group">
              {editingCode ? (
                <>
                  <input
                    autoFocus
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCode(); if (e.key === 'Escape') setEditingCode(false) }}
                    placeholder="e.g. P1"
                    className="text-xs font-black text-violet-700 border-b-2 border-violet-500 bg-transparent outline-none w-16 uppercase"
                    maxLength={8}
                  />
                  <button onClick={saveCode} disabled={saving} className="text-[10px] font-bold text-white bg-violet-600 px-2 py-0.5 rounded-lg disabled:opacity-50">Save</button>
                  <button onClick={() => setEditingCode(false)} className="text-[10px] font-semibold text-gray-400 hover:text-gray-600">Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-gray-400 font-semibold">Code:</span>
                  <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg">
                    {teacher.teacher_code ?? '—'}
                  </span>
                  <button
                    onClick={() => { setCodeInput(teacher.teacher_code ?? ''); setEditingCode(true) }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-violet-600 transition-all text-[10px] p-0.5 rounded"
                    title="Edit timetable code (P1, C1, M1…)"
                  >✏️</button>
                </>
              )}
            </div>
          </div>
          {teacher.centers && <CenterBadge name={teacher.centers.name} />}
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500">Role:</span>
            <div className="flex gap-2">
              {['teacher', 'academic_head', 'director'].map(r => (
                <button
                  key={r} onClick={() => updateRole(r)} disabled={saving}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold border transition-all ${
                    teacher.role === r
                      ? 'text-white border-violet-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-violet-400'
                  }`}
                  style={teacher.role === r ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}
                >
                  {r === 'academic_head' ? 'Head' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-400 font-semibold">{activeAssignments.length} active subject assignment{activeAssignments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Add assignment */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5 card-lift">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
          <h2 className="text-base font-black text-gray-900">➕ Add Assignment</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Batch</label>
              <select
                value={addBatchId} onChange={e => { setAddBatchId(e.target.value); setAddSubject('') }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="">Select batch…</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({(b.centers as { name: string }).name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Subject</label>
              <select
                value={addSubject} onChange={e => setAddSubject(e.target.value)} disabled={!addBatchId}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select subject…</option>
                {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</div>}
          <button
            onClick={addAssignment} disabled={saving || !addBatchId || !addSubject}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}
          >
            {saving ? 'Saving…' : 'Add Assignment'}
          </button>
        </div>
      </div>

      {/* Active assignments */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}>
          <h2 className="text-base font-black text-gray-900">✅ Active Assignments <span className="text-gray-400 font-bold">({activeAssignments.length})</span></h2>
        </div>
        {activeAssignments.length === 0 ? (
          <div className="px-6 py-8 text-gray-400 font-semibold text-sm text-center">No active assignments yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeAssignments.map(a => (
              <div key={a.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-2.5">
                  <SubjectBadge subject={a.subject} />
                  <span className="font-semibold text-gray-700">{a.batches?.name}</span>
                  {a.batches && <CenterBadge name={a.batches.centers.name} />}
                </div>
                <button
                  onClick={() => toggleAssignment(a.id, true)} disabled={saving}
                  className="text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive assignments */}
      {inactiveAssignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden opacity-70">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-base font-bold text-gray-500">Past Assignments ({inactiveAssignments.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {inactiveAssignments.map(a => (
              <div key={a.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex items-center gap-2.5">
                  <SubjectBadge subject={a.subject} />
                  <span className="text-sm text-gray-500">{a.batches?.name}</span>
                </div>
                <button
                  onClick={() => toggleAssignment(a.id, false)} disabled={saving}
                  className="text-sm font-bold text-green-600 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
