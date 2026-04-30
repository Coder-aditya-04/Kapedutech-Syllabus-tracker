'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Assignment { batch_id: string; batch_name: string; subject: string }
interface Upload {
  id: string; chapter_name: string; sub_topic: string | null; subject: string
  question_count: number; question_date: string; status: string; notes: string | null
  batches: { name: string } | null
  question_files: Array<{ id: string; file_url: string; file_name: string; file_type: string; is_fair_copy: boolean }>
}

interface Props {
  profileId: string
  assignments: Assignment[]
  recentUploads: Upload[]
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-100 text-blue-700', Chemistry: 'bg-purple-100 text-purple-700',
  Mathematics: 'bg-orange-100 text-orange-700', Botany: 'bg-green-100 text-green-700',
  Zoology: 'bg-teal-100 text-teal-700', Maths: 'bg-orange-100 text-orange-700',
}

export default function QuestionUploadForm({ profileId, assignments, recentUploads }: Props) {
  const supabase = createClient()

  const [uploads, setUploads] = useState<Upload[]>(recentUploads)
  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Unique batches from assignments
  const batchOptions = Array.from(
    new Map(assignments.map(a => [a.batch_id, a.batch_name])).entries()
  ).map(([id, name]) => ({ id, name }))

  const [form, setForm] = useState({
    batch_id: assignments[0]?.batch_id ?? '',
    subject: assignments[0]?.subject ?? '',
    chapter_name: '',
    sub_topic: '',
    question_count: 5,
    notes: '',
  })

  const subjectsForBatch = assignments.filter(a => a.batch_id === form.batch_id).map(a => a.subject)

  function set(key: string, val: string | number) {
    setForm(f => ({ ...f, [key]: val }))
    setError('')
  }

  async function uploadFilesToStorage(uploadId: string): Promise<Array<{ url: string; name: string; type: string }>> {
    const results: Array<{ url: string; name: string; type: string }> = []
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${profileId}/${uploadId}/${Date.now()}_${file.name}`
      const { error: uploadErr } = await supabase.storage.from('question-files').upload(path, file)
      if (uploadErr) {
        console.error('File upload error:', uploadErr.message)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('question-files').getPublicUrl(path)
      results.push({ url: publicUrl, name: file.name, type: ['pdf'].includes(ext) ? 'pdf' : 'image' })
    }
    return results
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.batch_id || !form.subject || !form.chapter_name.trim()) {
      setError('Please fill batch, subject and chapter name')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 1. Create upload record
      const res = await fetch('/api/question-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const { upload, error: apiErr } = await res.json()
      if (apiErr) throw new Error(apiErr)

      // 2. Upload files to storage and save URLs
      if (files.length > 0) {
        setUploadingFiles(true)
        const uploaded = await uploadFilesToStorage(upload.id)
        for (const f of uploaded) {
          await fetch('/api/question-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upload_id: upload.id, file_url: f.url, file_name: f.name, file_type: f.type }),
          })
        }
        setUploadingFiles(false)
      }

      // 3. Refresh uploads list
      const newUpload: Upload = {
        ...upload,
        batches: { name: batchOptions.find(b => b.id === form.batch_id)?.name ?? '' },
        question_files: [],
      }
      setUploads(prev => [newUpload, ...prev])
      setFiles([])
      if (fileRef.current) fileRef.current.value = ''
      setForm(f => ({ ...f, chapter_name: '', sub_topic: '', notes: '' }))
      setSuccess(`✅ ${form.question_count} questions uploaded for ${form.chapter_name}!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
      setUploadingFiles(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/question-upload?id=${id}`, { method: 'DELETE' })
    setUploads(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: '#ede9f9' }}>
      {/* Sticky nav header */}
      <div className="sticky top-0 z-10 nav-glow" style={{ background: 'linear-gradient(90deg,#08090A 0%,#0f0a1e 50%,#08090A 100%)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,#7C3AED 20%,#1A73E8 50%,#7C3AED 80%,transparent)' }} />
        <div className="max-w-screen-xl mx-auto px-5 h-16 flex items-center gap-4">
          <Link href="/teacher/log" className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            ←
          </Link>
          <Image src="/unacademy-logo.png" alt="Unacademy" width={120} height={34} className="brightness-0 invert" priority />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white">❓ Daily Questions</span>
          </div>
          <Link href="/teacher/log" className="shrink-0 px-3 py-1.5 rounded-full text-xs font-black text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
            ✏️ My Log
          </Link>
        </div>
      </div>

      {/* Page content */}
      <div className="relative max-w-screen-xl mx-auto px-4 md:px-8 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">❓ Daily Questions</h1>
        <p className="text-gray-500 text-base mt-1">Upload your 5 daily questions with chapter and sub-topic</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-900 text-base mb-2">Submit Questions</h2>

            {/* Batch */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Batch</label>
              <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none">
                {batchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Subject</label>
              <select value={form.subject} onChange={e => set('subject', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none">
                {subjectsForBatch.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Chapter */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Chapter Name *</label>
              <input value={form.chapter_name} onChange={e => set('chapter_name', e.target.value)}
                placeholder="e.g. Electrostatics, Thermodynamics…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none" />
            </div>

            {/* Sub-topic */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Sub-topic <span className="text-gray-300">(optional)</span></label>
              <input value={form.sub_topic} onChange={e => set('sub_topic', e.target.value)}
                placeholder="e.g. Coulomb's Law, Gauss Theorem…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none" />
            </div>

            {/* Question count */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">No. of Questions</label>
              <div className="flex items-center gap-2">
                {[1, 3, 5, 10].map(n => (
                  <button key={n} type="button"
                    onClick={() => set('question_count', n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${form.question_count === n ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300'}`}
                    style={form.question_count === n ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
                    {n}
                  </button>
                ))}
                <input type="number" min={1} max={50} value={form.question_count}
                  onChange={e => set('question_count', parseInt(e.target.value) || 5)}
                  className="w-16 px-2 py-2 rounded-xl border border-gray-200 text-sm font-bold text-center focus:ring-2 focus:ring-violet-400 outline-none" />
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                Upload Files <span className="text-gray-300">(PDF or Images — rough draft)</span>
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                {files.length === 0 ? (
                  <>
                    <div className="text-2xl mb-1">📎</div>
                    <div className="text-sm font-semibold text-gray-400">Click to upload PDF or images</div>
                    <div className="text-xs text-gray-300 mt-0.5">Multiple files supported</div>
                  </>
                ) : (
                  <div className="space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <span>{f.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                        <span className="truncate">{f.name}</span>
                        <span className="text-gray-400 shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ))}
                    <div className="text-xs text-violet-600 font-bold mt-1">Click to add more</div>
                  </div>
                )}
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files ?? []))} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Notes <span className="text-gray-300">(optional)</span></label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                placeholder="Any context for DTP operator…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 resize-none focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none" />
            </div>

            {error && <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            {success && <div className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{success}</div>}

            <button type="submit" disabled={loading || uploadingFiles}
              className="w-full py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}>
              {loading ? (uploadingFiles ? '⏫ Uploading files…' : '⏳ Saving…') : `📤 Submit ${form.question_count} Questions`}
            </button>
          </form>
        </div>

        {/* Past uploads */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="font-black text-gray-900 text-base">Recent Uploads</h2>
          {uploads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="font-bold text-gray-900">No uploads yet</div>
              <div className="text-sm text-gray-400 mt-1">Submit your first daily questions using the form</div>
            </div>
          ) : (
            uploads.map(up => {
              const sc = SUBJECT_COLORS[up.subject] ?? 'bg-gray-100 text-gray-700'
              const roughFiles = up.question_files.filter(f => !f.is_fair_copy)
              const fairFiles  = up.question_files.filter(f => f.is_fair_copy)
              return (
                <div key={up.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc}`}>{up.subject}</span>
                        <span className="font-black text-gray-900 text-sm">{up.chapter_name}</span>
                        {up.sub_topic && <span className="text-xs text-gray-400 font-semibold">· {up.sub_topic}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-semibold">
                        <span>{up.batches?.name}</span>
                        <span>·</span>
                        <span>{new Date(up.question_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span>·</span>
                        <span>{up.question_count} questions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${up.status === 'dtp_done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {up.status === 'dtp_done' ? '✅ DTP Done' : '⏳ Pending DTP'}
                      </span>
                      <button onClick={() => handleDelete(up.id)}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors font-bold px-1">✕</button>
                    </div>
                  </div>

                  {/* Rough files */}
                  {roughFiles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs font-bold text-gray-400 w-full">📎 Rough Draft:</span>
                      {roughFiles.map(f => (
                        <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors">
                          {f.file_type === 'pdf' ? '📄' : '🖼️'} {f.file_name}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Fair copy files from DTP */}
                  {fairFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs font-bold text-green-600 w-full">✅ Fair Copy (DTP):</span>
                      {fairFiles.map(f => (
                        <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">
                          {f.file_type === 'pdf' ? '📄' : '🖼️'} {f.file_name}
                        </a>
                      ))}
                    </div>
                  )}

                  {up.notes && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-medium">{up.notes}</div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
