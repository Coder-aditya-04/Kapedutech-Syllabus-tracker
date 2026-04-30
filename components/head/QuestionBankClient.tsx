'use client'
import { useState } from 'react'

type TypedQ = { id: string; question_number: number; question_text: string; option_a: string | null; option_b: string | null; option_c: string | null; option_d: string | null; correct_answer: string | null; difficulty: string }
type QFile  = { id: string; file_url: string; file_name: string; file_type: string; is_fair_copy: boolean; uploaded_by: string | null }

interface Upload {
  id: string; chapter_name: string; sub_topic: string | null; subject: string
  question_count: number; question_date: string; week_number: number; status: string; notes: string | null
  batches: { id: string; name: string; batch_type: string; centers: { name: string } | null } | null
  user_profiles: { id: string; name: string; employee_id: string | null } | null
  question_files: QFile[]
  typed_questions: TypedQ[]
}

interface Props {
  uploads: Upload[]
  centers: Array<{ id: string; name: string }>
  selectedSubject?: string
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'bg-blue-100 text-blue-700', Chemistry: 'bg-purple-100 text-purple-700',
  Mathematics: 'bg-orange-100 text-orange-700', Botany: 'bg-green-100 text-green-700',
  Zoology: 'bg-teal-100 text-teal-700', Maths: 'bg-orange-100 text-orange-700',
}

export function QuestionBankClient({ uploads, centers }: Props) {
  const [centerFilter, setCenterFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [typingFor, setTypingFor] = useState<string | null>(null)
  const [typedQs, setTypedQs] = useState<Record<string, TypedQ[]>>(
    Object.fromEntries(uploads.map(u => [u.id, u.typed_questions]))
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [newQ, setNewQ] = useState({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '', difficulty: 'medium' })

  // Filter by center
  const filtered = uploads.filter(u => {
    if (centerFilter !== 'all' && u.batches?.centers) {
      const centerData = u.batches.centers as { name: string } | null
      const centerName = centerData?.name ?? ''
      const center = centers.find(c => c.id === centerFilter)
      if (center && centerName !== center.name) return false
    }
    return true
  })

  // Group by chapter
  const byChapter = new Map<string, Upload[]>()
  for (const u of filtered) {
    const key = `${u.subject}||${u.chapter_name}`
    if (!byChapter.has(key)) byChapter.set(key, [])
    byChapter.get(key)!.push(u)
  }

  async function saveTypedQuestion(uploadId: string) {
    if (!newQ.question_text.trim()) return
    setSavingId(uploadId)
    const res = await fetch('/api/typed-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId, ...newQ }),
    })
    const { question } = await res.json()
    if (question) {
      setTypedQs(prev => ({ ...prev, [uploadId]: [...(prev[uploadId] ?? []), question] }))
      setNewQ({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '', difficulty: 'medium' })
      setTypingFor(null)
    }
    setSavingId(null)
  }

  async function deleteTypedQ(uploadId: string, qId: string) {
    await fetch(`/api/typed-question?id=${qId}`, { method: 'DELETE' })
    setTypedQs(prev => ({ ...prev, [uploadId]: (prev[uploadId] ?? []).filter(q => q.id !== qId) }))
  }

  if (filtered.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
        <div className="text-5xl mb-4">❓</div>
        <div className="text-xl font-black text-gray-900">No question uploads yet</div>
        <div className="text-gray-400 text-sm mt-2">Teachers submit daily questions from their Questions page</div>
      </div>
    )
  }

  return (
    <div>
      {/* Center filter */}
      {centers.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Center</span>
          {[{ id: 'all', name: 'All' }, ...centers].map(c => (
            <button key={c.id} onClick={() => setCenterFilter(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${centerFilter === c.id ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}
              style={centerFilter === c.id ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {Array.from(byChapter).map(([key, chapterUploads]) => {
          const [subject, chapterName] = key.split('||')
          const sc = SUBJECT_COLORS[subject] ?? 'bg-gray-100 text-gray-700'
          const totalQ = chapterUploads.reduce((s, u) => s + u.question_count, 0)
          const pending = chapterUploads.filter(u => u.status === 'uploaded').length

          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Chapter header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                style={{ background: 'linear-gradient(135deg,#fafafa,#f5f3ff)' }}
                onClick={() => setExpandedId(expandedId === key ? null : key)}>
                <div className="flex items-center gap-3 flex-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc}`}>{subject}</span>
                  <span className="font-black text-gray-900">{chapterName}</span>
                  <span className="text-xs text-gray-400 font-semibold">{chapterUploads.length} upload{chapterUploads.length !== 1 ? 's' : ''} · {totalQ} questions</span>
                </div>
                <div className="flex items-center gap-2">
                  {pending > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{pending} pending</span>
                  )}
                  <span className="text-gray-400 text-sm">{expandedId === key ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === key && (
                <div className="divide-y divide-gray-50">
                  {chapterUploads.map(up => {
                    const roughFiles = up.question_files.filter(f => !f.is_fair_copy)
                    const fairFiles  = up.question_files.filter(f => f.is_fair_copy)
                    const tqs = typedQs[up.id] ?? []
                    const isTyping = typingFor === up.id

                    return (
                      <div key={up.id} className="p-5">
                        {/* Upload meta row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">{up.user_profiles?.name}</span>
                              {up.user_profiles?.employee_id && <span className="text-xs text-gray-400">{up.user_profiles.employee_id}</span>}
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs font-semibold text-gray-500">{up.batches?.name}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs font-semibold text-gray-500">
                                {new Date(up.question_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs font-semibold text-violet-600">Wk {up.week_number}</span>
                            </div>
                            {up.sub_topic && <div className="text-xs text-gray-400 mt-0.5 font-medium">Sub-topic: {up.sub_topic}</div>}
                            {up.notes && <div className="text-xs text-gray-500 mt-0.5 italic">&quot;{up.notes}&quot;</div>}
                          </div>
                          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${up.status === 'dtp_done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {up.status === 'dtp_done' ? '✅ DTP Done' : '⏳ DTP Pending'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* SECTION 1: Rough (teacher upload) */}
                          <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3">
                            <div className="text-xs font-black text-orange-700 uppercase tracking-wide mb-2">
                              📝 Rough Draft — {up.question_count} Qs
                            </div>
                            {roughFiles.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">No files uploaded</p>
                            ) : (
                              <div className="space-y-1.5">
                                {roughFiles.map(f => (
                                  <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs font-semibold text-orange-700 hover:text-orange-900 group">
                                    <span className="shrink-0">{f.file_type === 'pdf' ? '📄' : '🖼️'}</span>
                                    <span className="truncate group-hover:underline">{f.file_name}</span>
                                    <span className="shrink-0 text-orange-400 group-hover:text-orange-600">↗</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* SECTION 2: Fair copy (DTP) */}
                          <div className="rounded-xl border border-green-200 bg-green-50/40 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-black text-green-700 uppercase tracking-wide">
                                ✅ Fair Copy (DTP) — {tqs.length + fairFiles.length} items
                              </div>
                              <button onClick={() => setTypingFor(isTyping ? null : up.id)}
                                className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                                {isTyping ? '✕ Cancel' : '+ Add Q'}
                              </button>
                            </div>

                            {/* Fair files (PDFs/Word uploaded by DTP) */}
                            {fairFiles.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {fairFiles.map(f => (
                                  <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs font-semibold text-green-700 hover:underline">
                                    <span>{f.file_type === 'pdf' ? '📄' : '🖼️'}</span>
                                    <span className="truncate">{f.file_name}</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Typed questions */}
                            {tqs.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {tqs.map(q => (
                                  <div key={q.id} className="bg-white rounded-lg border border-green-100 p-2.5 text-xs group">
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex-1">
                                        <div className="font-bold text-gray-800">Q{q.question_number}. {q.question_text}</div>
                                        {(q.option_a || q.option_b) && (
                                          <div className="mt-1 grid grid-cols-2 gap-1 text-gray-500">
                                            {q.option_a && <span className="font-medium">(A) {q.option_a}</span>}
                                            {q.option_b && <span className="font-medium">(B) {q.option_b}</span>}
                                            {q.option_c && <span className="font-medium">(C) {q.option_c}</span>}
                                            {q.option_d && <span className="font-medium">(D) {q.option_d}</span>}
                                          </div>
                                        )}
                                        {q.correct_answer && (
                                          <span className="mt-1 inline-block text-green-700 font-bold">Ans: {q.correct_answer}</span>
                                        )}
                                      </div>
                                      <button onClick={() => deleteTypedQ(up.id, q.id)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all font-bold shrink-0">✕</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {tqs.length === 0 && fairFiles.length === 0 && !isTyping && (
                              <p className="text-xs text-gray-400 italic">No fair copy yet — click &quot;+ Add Q&quot; to type</p>
                            )}

                            {/* Type new question form */}
                            {isTyping && (
                              <div className="bg-white rounded-xl border border-green-200 p-3 space-y-2 mt-2">
                                <textarea value={newQ.question_text}
                                  onChange={e => setNewQ(p => ({ ...p, question_text: e.target.value }))}
                                  placeholder="Question text…" rows={2}
                                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 resize-none focus:ring-2 focus:ring-green-400 outline-none font-medium" />
                                <div className="grid grid-cols-2 gap-1.5">
                                  {['a', 'b', 'c', 'd'].map(o => (
                                    <input key={o} value={newQ[`option_${o}` as keyof typeof newQ] as string}
                                      onChange={e => setNewQ(p => ({ ...p, [`option_${o}`]: e.target.value }))}
                                      placeholder={`Option ${o.toUpperCase()}`}
                                      className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:ring-1 focus:ring-green-400 outline-none" />
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <input value={newQ.correct_answer}
                                    onChange={e => setNewQ(p => ({ ...p, correct_answer: e.target.value }))}
                                    placeholder="Correct answer (A/B/C/D)"
                                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:ring-1 focus:ring-green-400 outline-none" />
                                  <select value={newQ.difficulty}
                                    onChange={e => setNewQ(p => ({ ...p, difficulty: e.target.value }))}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none">
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                  </select>
                                </div>
                                <button onClick={() => saveTypedQuestion(up.id)}
                                  disabled={savingId === up.id || !newQ.question_text.trim()}
                                  className="w-full py-2 rounded-lg text-xs font-black text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors">
                                  {savingId === up.id ? 'Saving…' : '💾 Save Question'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
