'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import Link from 'next/link'

interface Teacher {
  id: string; name: string; employee_id: string | null; role: string; center_id: string | null
  centers: { name: string } | null
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

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Add form state
  const [addBatchId, setAddBatchId] = useState('')
  const [addSubject, setAddSubject] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [tRes, aRes, bRes] = await Promise.all([
      supabase.from('user_profiles').select('id, name, employee_id, role, center_id, centers(name)').eq('id', id).single(),
      supabase.from('teacher_batch_assignments').select('id, subject, is_active, batches(id, name, batch_type, centers(name))').eq('teacher_id', id).order('is_active', { ascending: false }),
      supabase.from('batches').select('id, name, batch_type, class_level, centers(name)').eq('is_active', true).order('name'),
    ])
    setTeacher(tRes.data as unknown as Teacher)
    setAssignments(aRes.data as unknown as Assignment[])
    setBatches(bRes.data as unknown as Batch[])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const selectedBatch = batches.find(b => b.id === addBatchId)
  const availableSubjects = selectedBatch
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
    await load()
    setSaving(false)
  }

  async function toggleAssignment(assignmentId: string, currentActive: boolean) {
    setSaving(true)
    await supabase.from('teacher_batch_assignments').update({ is_active: !currentActive }).eq('id', assignmentId)
    await load()
    setSaving(false)
  }

  async function updateRole(newRole: string) {
    setSaving(true)
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', id)
    await load()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="max-w-2xl">
        <p className="text-gray-500">Teacher not found.</p>
        <Link href="/head/teachers" className="text-purple-700 text-sm font-semibold mt-2 inline-block">← Back to Teachers</Link>
      </div>
    )
  }

  const activeAssignments = assignments.filter(a => a.is_active)
  const inactiveAssignments = assignments.filter(a => !a.is_active)

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/head/teachers" className="text-gray-400 hover:text-gray-600 text-sm">← Teachers</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{teacher.name}</h1>
      </div>

      {/* Teacher info */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">{teacher.name}</div>
              {teacher.employee_id && <div className="text-xs text-gray-400">{teacher.employee_id}</div>}
            </div>
            {teacher.centers && <CenterBadge name={teacher.centers.name} />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Role:</span>
            <div className="flex gap-1.5">
              {['teacher', 'academic_head', 'director'].map(r => (
                <button
                  key={r}
                  onClick={() => updateRole(r)}
                  disabled={saving}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${
                    teacher.role === r
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                  }`}
                >
                  {r === 'academic_head' ? 'Head' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">{activeAssignments.length} active subject assignment{activeAssignments.length !== 1 ? 's' : ''}</div>
        </CardContent>
      </Card>

      {/* Add assignment */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Batch</label>
              <select
                value={addBatchId}
                onChange={e => { setAddBatchId(e.target.value); setAddSubject('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select batch…</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({(b.centers as { name: string }).name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Subject</label>
              <select
                value={addSubject}
                onChange={e => setAddSubject(e.target.value)}
                disabled={!addBatchId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select subject…</option>
                {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="text-red-600 text-xs">{error}</div>}
          <Button
            onClick={addAssignment}
            disabled={saving || !addBatchId || !addSubject}
            className="text-white"
            style={{ background: '#6929C4' }}
          >
            {saving ? 'Saving…' : 'Add Assignment'}
          </Button>
        </CardContent>
      </Card>

      {/* Active assignments */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active Assignments ({activeAssignments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeAssignments.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400">No active assignments yet</div>
          ) : (
            <div>
              {activeAssignments.map(a => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <SubjectBadge subject={a.subject} />
                    <span className="text-sm font-medium text-gray-700">{a.batches?.name}</span>
                    {a.batches && <CenterBadge name={a.batches.centers.name} />}
                  </div>
                  <button
                    onClick={() => toggleAssignment(a.id, true)}
                    disabled={saving}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive assignments */}
      {inactiveAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-400">Past Assignments ({inactiveAssignments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div>
              {inactiveAssignments.map(a => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 opacity-50">
                  <div className="flex items-center gap-2">
                    <SubjectBadge subject={a.subject} />
                    <span className="text-sm text-gray-500">{a.batches?.name}</span>
                  </div>
                  <button
                    onClick={() => toggleAssignment(a.id, false)}
                    disabled={saving}
                    className="text-xs text-green-600 hover:text-green-800 font-semibold px-2 py-1 rounded hover:bg-green-50 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
