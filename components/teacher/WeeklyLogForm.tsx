'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

const ACADEMIC_START = new Date(2026, 4, 1)

function dateToWeek(dateStr: string): number {
  if (!dateStr) return 1
  const d = new Date(dateStr)
  return Math.max(1, Math.floor((d.getTime() - ACADEMIC_START.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]!
}

interface Props { userId: string; userRole: string; userName: string }

interface Assignment {
  id: string; subject: string
  batches: { id: string; name: string; batch_type: string; class_level: string; centers: { name: string } | null }
}
interface SubmitResult {
  teacher: string; center: string; batch: string; subject: string
  chapter: string; lectures: number; weekNo: number; isHoliday: boolean
  isChapterComplete: boolean; logDate: string
}

const SUBJECT_COLORS: Record<string, string> = {
  Physics:     '#1A73E8',
  Chemistry:   '#7C3AED',
  Botany:      '#43A047',
  Zoology:     '#0891b2',
  Mathematics: '#f59e0b',
}

export default function WeeklyLogForm({ userId, userRole, userName }: Props) {
  const supabase = createClient()
  const isAdmin = userRole === 'academic_head' || userRole === 'director'

  const [profileId, setProfileId]     = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading]         = useState(true)

  const [selectedId, setSelectedId]   = useState('')
  const [logDate, setLogDate]         = useState(todayStr())
  const weekNo                        = dateToWeek(logDate)
  const [isHoliday, setIsHoliday]     = useState(false)
  const [subject, setSubject]         = useState('')
  const [chapter, setChapter]         = useState('')
  const [chapterInput, setChapterInput] = useState('')
  const [chapters, setChapters]       = useState<string[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [subtopics, setSubtopics]     = useState('')
  const [lectures, setLectures]       = useState(0)
  const [isChapterComplete, setIsChapterComplete] = useState(false)
  const [notes, setNotes]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [result, setResult]           = useState<SubmitResult | null>(null)

  // Chapter-wise tracking
  const [chapterPlan, setChapterPlan] = useState(0)
  const [chapterDone, setChapterDone] = useState(0)

  const currentAssignment = assignments.find(a => a.id === selectedId)
  const currentBatch      = currentAssignment?.batches ?? null
  const batchSubjects     = currentBatch
    ? assignments.filter(a => a.batches.id === currentBatch.id).map(a => a.subject)
    : []

  // Load profile + assignments (all roles use their own assignments)
  useEffect(() => {
    async function load() {
      const { data: prof } = await supabase
        .from('user_profiles').select('id, name').eq('user_id', userId).single()
      const pid = (prof as { id: string } | null)?.id ?? ''
      setProfileId(pid)

      if (pid) {
        const { data } = await supabase
          .from('teacher_batch_assignments')
          .select('id, subject, batches(id, name, batch_type, class_level, centers(name))')
          .eq('teacher_id', pid).eq('is_active', true)
        setAssignments((data ?? []) as unknown as Assignment[])
      }
      setLoading(false)
    }
    load()
  }, [userId]) // eslint-disable-line

  // Load chapters from lecture_plans when subject + batch changes
  useEffect(() => {
    if (!subject || !currentBatch) { setChapters([]); setChapter(''); return }
    setChaptersLoading(true); setChapter(''); setChapterPlan(0); setChapterDone(0)
    async function fetchChapters() {
      const batchBase = currentBatch!.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
      const { data } = await supabase
        .from('lecture_plans')
        .select('topic_name')
        .eq('batch_type', batchBase)
        .eq('class_level', currentBatch!.class_level)
        .eq('subject', subject)
        .order('month_name')
      const seen = new Set<string>(); const unique: string[] = []
      for (const r of data ?? []) {
        if (!seen.has(r.topic_name)) { seen.add(r.topic_name); unique.push(r.topic_name) }
      }
      setChapters(unique)
      setChaptersLoading(false)
    }
    fetchChapters()
  }, [subject, currentBatch]) // eslint-disable-line

  // Load chapter-wise plan + cumulative done when chapter is selected
  const loadChapterStats = useCallback(async (chapterName: string) => {
    if (!chapterName || chapterName === '__other__' || !currentBatch || !profileId) {
      setChapterPlan(0); setChapterDone(0); return
    }
    const batchBase = currentBatch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
    const [planRes, doneRes] = await Promise.all([
      supabase.from('lecture_plans')
        .select('planned_lectures')
        .eq('batch_type', batchBase)
        .eq('class_level', currentBatch.class_level)
        .eq('subject', subject)
        .eq('topic_name', chapterName),
      supabase.from('weekly_logs')
        .select('lectures_this_week')
        .eq('teacher_id', profileId)
        .eq('batch_id', currentBatch.id)
        .eq('subject', subject)
        .eq('chapter_name', chapterName)
        .eq('is_holiday', false),
    ])
    const planned = (planRes.data ?? []).reduce((s, r) => s + r.planned_lectures, 0)
    const done    = (doneRes.data ?? []).reduce((s, r) => s + r.lectures_this_week, 0)
    setChapterPlan(planned)
    setChapterDone(done)
  }, [currentBatch, profileId, subject]) // eslint-disable-line

  useEffect(() => { loadChapterStats(chapter) }, [chapter, loadChapterStats])

  async function handleSubmit() {
    if (!profileId) { setError('Profile not found.'); return }
    if (!selectedId) { setError('Please select a batch.'); return }
    if (!isHoliday) {
      if (!subject) { setError('Please select a subject.'); return }
      const ch = chapter === '__other__' ? chapterInput.trim() : chapter
      if (!ch) { setError('Please enter the chapter name.'); return }
      if (lectures === 0) { setError('Please enter number of lectures.'); return }
    }
    setError(''); setSubmitting(true)
    const ch = chapter === '__other__' ? chapterInput.trim() : chapter
    const finalNotes = [
      isChapterComplete ? '✅ Chapter completed.' : '',
      notes,
    ].filter(Boolean).join(' ').trim() || null

    const { error: dbError } = await supabase.from('weekly_logs').insert({
      teacher_id: profileId, batch_id: currentBatch!.id,
      subject: (subject || 'Physics') as never,
      chapter_name: ch || 'Holiday',
      subtopics_covered: subtopics || null,
      lectures_this_week: isHoliday ? 0 : lectures,
      week_number: weekNo, notes: finalNotes, is_holiday: isHoliday,
    })
    setSubmitting(false)
    if (dbError) { setError(dbError.message); return }
    setResult({
      teacher: userName, center: currentBatch!.centers?.name ?? '',
      batch: currentBatch!.name, subject, chapter: ch || 'Holiday',
      lectures, weekNo, isHoliday, isChapterComplete, logDate,
    })
  }

  function resetForm() {
    setResult(null); setSelectedId(''); setSubject(''); setChapter('')
    setChapterInput(''); setSubtopics(''); setLectures(0); setNotes('')
    setIsHoliday(false); setIsChapterComplete(false); setError('')
    setLogDate(todayStr()); setChapterPlan(0); setChapterDone(0)
  }

  const accentColor = subject ? (SUBJECT_COLORS[subject] ?? '#7C3AED') : '#7C3AED'
  const ch          = chapter === '__other__' ? chapterInput.trim() : chapter
  const afterToday  = chapterDone + lectures
  const chPercent   = chapterPlan > 0 ? Math.round((afterToday / chapterPlan) * 100) : 0
  const backHref    = isAdmin ? '/head/dashboard' : '/teacher/history'

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen" style={{ background: '#ede9f9' }}>
      <div className="h-[72px]" style={{ background: '#08090A' }} />
      <div className="max-w-lg mx-auto p-4 space-y-3 pt-8">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-white/70 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  // ── Success ──
  if (result) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#ede9f9' }}>
      <div className="max-w-md w-full animate-scale-in">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg"
            style={{ background: 'linear-gradient(135deg,#43A047,#1A73E8)' }}>✓</div>
          <h2 className="text-2xl font-black text-gray-900">Log Submitted!</h2>
          <p className="text-sm text-gray-500 mt-1">Week {result.weekNo} entry saved</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 shadow-sm">
          {(result.isHoliday
            ? [['Teacher', result.teacher],['Batch', result.batch],['Date', result.logDate],['Week', `Week ${result.weekNo}`],['Status', '🟠 Holiday']]
            : [
                ['Teacher', result.teacher],['Batch', result.batch],['Subject', result.subject],
                ['Chapter', result.chapter.replace(/^\[[^\]]*\]\s*/, '')],
                ['Lectures', String(result.lectures)],
                ...(result.isChapterComplete ? [['Chapter Done', '✅ Completed']] : []),
                ['Date', result.logDate],['Week', `Week ${result.weekNo}`],
              ]
          ).map(([k,v]) => (
            <div key={k} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-400">{k}</span>
              <span className="font-semibold text-gray-900">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={resetForm} className="flex-1 py-3.5 text-white text-sm font-bold rounded-2xl shadow-md"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}>
            ✏️ Log Another
          </button>
          <Link href={backHref} className="flex-1 py-3.5 bg-gray-900 text-white text-sm font-bold rounded-2xl flex items-center justify-center hover:bg-gray-800">
            ← Back
          </Link>
        </div>
      </div>
    </div>
  )

  // ── Form ──
  return (
    <div className="min-h-screen pb-12 relative" style={{ background: '#ede9f9' }}>

      {/* Floating blobs */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-60px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(180,155,240,0.45)', filter: 'blur(18px)', animation: 'float1 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-40px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(147,197,253,0.40)', filter: 'blur(18px)', animation: 'float2 26s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', left: '50%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(216,180,254,0.35)', filter: 'blur(16px)', animation: 'float3 32s ease-in-out infinite' }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 nav-glow" style={{ background: 'linear-gradient(90deg,#08090A 0%,#0f0a1e 50%,#08090A 100%)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,#7C3AED 20%,#1A73E8 50%,#7C3AED 80%,transparent)' }} />
        <div className="max-w-lg mx-auto px-5 h-16 flex items-center gap-4">
          <Link href={backHref} className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            ←
          </Link>
          <Image src="/unacademy-logo.png" alt="Unacademy" width={120} height={34} className="brightness-0 invert" priority />
          <div className="flex-1 min-w-0 text-right">
            <div className="text-xs text-gray-400 font-semibold truncate">{userName}</div>
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-full text-xs font-black text-white"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}>
            Week {weekNo}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 space-y-4 animate-fade-up">

        {/* ── Quick links ── */}
        <Link href="/teacher/questions"
          className="flex items-center gap-3 bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-4 hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: 'linear-gradient(135deg,#7C3AED22,#1A73E822)' }}>❓</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-gray-900">Daily Questions</div>
            <div className="text-xs text-gray-400 font-medium">Upload today&apos;s 5 questions</div>
          </div>
          <span className="text-gray-300 group-hover:text-violet-500 transition-colors font-bold">→</span>
        </Link>

        {/* ── Date ── */}
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">📅 Log Date</label>
          <input type="date" value={logDate} max={todayStr()}
            onChange={e => setLogDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <p className="text-xs text-gray-400 mt-2 font-medium">Academic Week {weekNo} · year starts May 2026</p>
        </div>

        {/* ── Batch ── */}
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
            🏫 Batch <span className="text-red-400 normal-case font-normal ml-1">required</span>
          </label>
          <select value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setSubject(''); setChapter(''); setChapterPlan(0); setChapterDone(0) }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none bg-white"
          >
            <option value="">— Select your batch —</option>
            {/* Group unique batches from assignments */}
            {Array.from(new Map(assignments.map(a => [a.batches.id, a])).values()).map(a => (
              <option key={a.batches.id} value={a.id}>
                {a.batches.name} · {a.batches.centers?.name} · Class {a.batches.class_level}
              </option>
            ))}
          </select>
          {assignments.length === 0 && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ No active batch assignments. Ask your academic head to assign you to a batch.
            </p>
          )}
          {currentBatch && (
            <div className="mt-3 px-4 py-3 rounded-xl" style={{ background: '#EBF3FE', border: '1px solid #BDD7FC' }}>
              <p className="text-xs font-black" style={{ color: '#1A73E8' }}>{currentBatch.name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#4A9AEE' }}>
                {currentBatch.centers?.name} · Class {currentBatch.class_level} · {currentBatch.batch_type}
              </p>
            </div>
          )}
        </div>

        {/* ── Week Status ── */}
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">📌 Week Status</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setIsHoliday(false)}
              className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${!isHoliday ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >✅ Lectures Held</button>
            <button onClick={() => setIsHoliday(true)}
              className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${isHoliday ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >🟠 Holiday / No Class</button>
          </div>
        </div>

        {!isHoliday && (
          <>
            {/* ── Subject ── */}
            <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5"
              style={{ borderLeft: subject ? `4px solid ${accentColor}` : undefined }}>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
                📚 Subject <span className="text-red-400 normal-case font-normal ml-1">required</span>
              </label>
              <select value={subject}
                onChange={e => { setSubject(e.target.value); setChapter(''); setChapterPlan(0); setChapterDone(0) }}
                disabled={!selectedId}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 bg-white"
              >
                <option value="">{selectedId ? '— Select subject —' : '— Select batch first —'}</option>
                {batchSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* ── Chapter ── */}
            <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5"
              style={{ borderLeft: chapter && chapter !== '__other__' ? `4px solid ${accentColor}` : undefined }}>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
                📖 Chapter / Topic <span className="text-red-400 normal-case font-normal ml-1">required</span>
              </label>
              {chaptersLoading
                ? <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                : <select value={chapter} onChange={e => { setChapter(e.target.value); setIsChapterComplete(false) }}
                    disabled={!subject}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 bg-white"
                  >
                    <option value="">{subject ? '— Select chapter —' : '— Select subject first —'}</option>
                    {chapters.map(c => (
                      <option key={c} value={c}>{c.replace(/^\[[^\]]*\]\s*/, '')}</option>
                    ))}
                    <option value="__other__">Other / Not in plan</option>
                  </select>
              }
              {chapters.length === 0 && subject && !chaptersLoading && (
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ No chapters in the plan yet. Ask your head to add chapters in the Planner.
                </p>
              )}
              {chapter === '__other__' && (
                <input type="text" value={chapterInput} onChange={e => setChapterInput(e.target.value)}
                  placeholder="Type chapter name…"
                  className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              )}
            </div>

            {/* ── Chapter Progress Info ── shows when chapter is selected and has a plan */}
            {ch && chapterPlan > 0 && (
              <div className="rounded-2xl border shadow-sm overflow-hidden"
                style={{
                  background: afterToday > chapterPlan * 1.15
                    ? 'linear-gradient(135deg,#fff7ed,#fed7aa)'
                    : afterToday >= chapterPlan * 0.75
                    ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)'
                    : 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                  borderColor: afterToday > chapterPlan * 1.15 ? '#fed7aa' : afterToday >= chapterPlan * 0.75 ? '#bbf7d0' : '#bfdbfe',
                }}>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[11px] font-black uppercase tracking-wider mb-1"
                    style={{ color: afterToday > chapterPlan * 1.15 ? '#92400e' : afterToday >= chapterPlan * 0.75 ? '#166534' : '#1e3a8a' }}>
                    📊 Chapter Lecture Allocation
                  </p>
                  <p className="font-black text-gray-900 text-sm">{ch.replace(/^\[[^\]]*\]\s*/, '')}</p>
                </div>

                <div className="px-5 pb-4">
                  <div className="flex items-end justify-between mb-2 mt-3">
                    <div className="text-center">
                      <div className="text-2xl font-black text-gray-900">{chapterDone}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">done so far</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 font-bold">+ {lectures} today</div>
                      <div className="text-xl font-black" style={{ color: accentColor }}>= {afterToday}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">after this log</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-gray-900">{chapterPlan}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">planned total</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 bg-white/50 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(chPercent, 100)}%`,
                        background: afterToday > chapterPlan * 1.15 ? '#f97316' : afterToday >= chapterPlan * 0.75 ? '#22c55e' : '#3b82f6',
                      }} />
                  </div>

                  <p className="text-xs font-semibold text-center" style={{
                    color: afterToday > chapterPlan * 1.15 ? '#c2410c' : afterToday >= chapterPlan * 0.75 ? '#166534' : '#1e40af'
                  }}>
                    {chPercent}% of {chapterPlan} planned lectures used
                    {afterToday > chapterPlan
                      ? ` · ⚠️ ${afterToday - chapterPlan} over planned allocation`
                      : afterToday < chapterPlan
                      ? ` · ${chapterPlan - afterToday} lectures remaining`
                      : ' · ✅ Exactly on plan'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Sub-topics ── */}
            <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
                🔍 Sub-topics Covered <span className="text-gray-400 normal-case font-normal">(optional)</span>
              </label>
              <textarea value={subtopics} onChange={e => setSubtopics(e.target.value)}
                placeholder="e.g. Coulomb's Law, Electric Field, Gauss's Law…"
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            {/* ── Lecture counter ── */}
            <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-4">
                🎓 Lectures This Week <span className="text-red-400 normal-case font-normal ml-1">required</span>
              </label>
              <div className="flex items-center gap-4">
                <button onClick={() => setLectures(l => Math.max(0, l-1))}
                  className="w-12 h-12 rounded-full border-2 border-gray-200 text-2xl font-bold flex items-center justify-center hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all">−</button>
                <div className="flex-1 text-center">
                  <div className="text-5xl font-black text-gray-900 tabular-nums" style={{ color: accentColor }}>{lectures}</div>
                  <div className="text-xs text-gray-400 font-semibold mt-1">lectures this week</div>
                </div>
                <button onClick={() => setLectures(l => Math.min(30, l+1))}
                  className="w-12 h-12 rounded-full border-2 border-gray-200 text-2xl font-bold flex items-center justify-center hover:border-green-300 hover:text-green-600 hover:bg-green-50 transition-all">+</button>
                <input type="number" min={0} max={30} value={lectures}
                  onChange={e => setLectures(Math.max(0, parseInt(e.target.value)||0))}
                  className="w-16 text-center text-sm font-black px-2 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>

            {/* ── Chapter Complete Toggle ── */}
            {ch && (
              <div className={`rounded-2xl border shadow-sm p-5 transition-all ${isChapterComplete ? 'bg-green-50 border-green-300' : 'bg-white/90 backdrop-blur border-white'}`}>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3">
                  🏁 Chapter Status
                </label>
                <p className="text-sm text-gray-600 mb-4 font-medium">
                  Did you <strong>finish teaching this chapter</strong> this week? (Not just this week&apos;s portion — the entire chapter)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setIsChapterComplete(false)}
                    className={`py-3.5 rounded-xl text-sm font-bold border-2 transition-all ${!isChapterComplete ? 'bg-gray-100 border-gray-400 text-gray-800' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                  >
                    🔄 Still in Progress
                  </button>
                  <button onClick={() => setIsChapterComplete(true)}
                    className={`py-3.5 rounded-xl text-sm font-bold border-2 transition-all ${isChapterComplete ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700'}`}
                  >
                    ✅ Chapter Complete!
                  </button>
                </div>
                {isChapterComplete && (
                  <p className="text-xs text-green-700 font-semibold mt-3 bg-green-100 px-3 py-2 rounded-lg">
                    This chapter will be marked as completed in the Chapter Progress report.
                  </p>
                )}
              </div>
            )}

            {/* ── Notes ── */}
            <div className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-sm p-5">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
                💬 Notes for Academic Head <span className="text-gray-400 normal-case font-normal">(optional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Students struggling? Pace issue? Extra info?"
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </>
        )}

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 text-white rounded-2xl font-black text-base transition-all disabled:opacity-50 shadow-lg hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: submitting ? '#9ca3af' : 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}
        >
          {submitting ? 'Saving…' : '✓ Submit Weekly Log'}
        </button>

        <Link href={backHref} className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">
          ← Back to {isAdmin ? 'Dashboard' : 'History'}
        </Link>
      </div>
    </div>
  )
}
