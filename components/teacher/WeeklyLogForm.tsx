'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculatePace, getCurrentMonthKey, PLAN } from '@/lib/pace'
import { SUBJECTS_BY_BATCH } from '@/lib/constants'
import type { Subject } from '@/lib/supabase/types'

interface TeacherProfile {
  id: string
  name: string
  center_id: string | null
  centers: { name: string } | null
  teacher_batch_assignments: Array<{
    id: string
    subject: Subject
    batch_id: string
    batches: { id: string; name: string; batch_type: string; class_level: string }
  }>
}

interface SubmitResult {
  teacher: string
  center: string
  batch: string
  subject: string
  chapter: string
  lectures: number
  weekNo: number
  isHoliday: boolean
}

export default function WeeklyLogForm({ userId }: { userId: string }) {
  const supabase = createClient()

  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [weekNo, setWeekNo] = useState(1)
  const [isHoliday, setIsHoliday] = useState(false)
  const [subject, setSubject] = useState<Subject | ''>('')
  const [chapter, setChapter] = useState('')
  const [chapterInput, setChapterInput] = useState('')
  const [chapters, setChapters] = useState<string[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [subtopics, setSubtopics] = useState('')
  const [lectures, setLectures] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [progress, setProgress] = useState(4)

  // Derived state
  const selectedAssignment = profile?.teacher_batch_assignments.find(a => a.id === selectedAssignmentId)
  const currentBatch = selectedAssignment?.batches
  const batchSubjects = currentBatch ? SUBJECTS_BY_BATCH[currentBatch.batch_type] ?? [] : []

  // Academic week calculation
  useEffect(() => {
    const start = new Date(2026, 4, 1)
    const wk = Math.max(1, Math.floor((Date.now() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
    setWeekNo(wk)
  }, [])

  // Load teacher profile + assignments
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('user_profiles')
        .select(`
          id, name, center_id,
          centers(name),
          teacher_batch_assignments(
            id, subject, batch_id,
            batches(id, name, batch_type, class_level)
          )
        `)
        .eq('user_id', userId)
        .eq('teacher_batch_assignments.is_active', true)
        .single()

      setProfile(data as unknown as TeacherProfile)
      setLoading(false)
    }
    load()
  }, [userId, supabase])

  // Load chapters when subject + assignment selected
  useEffect(() => {
    if (!subject || !currentBatch) {
      setChapters([])
      setChapter('')
      return
    }
    setChaptersLoading(true)
    setChapter('')
    async function fetchChapters() {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', subject)
        .single()
      if (!subjects) { setChaptersLoading(false); return }

      const { data } = await supabase
        .from('syllabus_topics')
        .select('chapter_name')
        .eq('subject_id', subjects.id)
        .eq('class_level', currentBatch!.class_level)
        .order('chapter_order')
      const unique = Array.from(new Set((data ?? []).map(r => r.chapter_name)))
      setChapters(unique)
      setChaptersLoading(false)
    }
    fetchChapters()
  }, [subject, currentBatch, supabase])

  // Update progress bar
  const updateProgress = useCallback(() => {
    if (isHoliday) { setProgress(selectedAssignmentId ? 100 : 30); return }
    let filled = 0
    if (selectedAssignmentId) filled++
    if (subject) filled++
    const ch = chapter === '__other__' ? chapterInput : chapter
    if (ch) filled++
    if (lectures > 0) filled++
    setProgress(Math.round((filled / 4) * 96) + 4)
  }, [selectedAssignmentId, isHoliday, subject, chapter, chapterInput, lectures])

  useEffect(() => { updateProgress() }, [updateProgress])

  async function handleSubmit() {
    if (!profile || !selectedAssignment) { setError('Please select your batch assignment.'); return }
    if (!isHoliday) {
      if (!subject) { setError('Please select a subject.'); return }
      const ch = chapter === '__other__' ? chapterInput.trim() : chapter
      if (!ch) { setError('Please enter the chapter name.'); return }
      if (lectures === 0) { setError('Please enter how many lectures you took.'); return }
    }
    setError('')
    setSubmitting(true)

    const centerName = profile.centers?.name ?? ''
    const ch = chapter === '__other__' ? chapterInput.trim() : chapter

    const { error: dbError } = await supabase.from('weekly_logs').insert({
      teacher_id: profile.id,
      batch_id: currentBatch!.id,
      subject: (subject || 'Physics') as Subject,
      chapter_name: ch || 'Holiday',
      subtopics_covered: subtopics || null,
      lectures_this_week: isHoliday ? 0 : lectures,
      week_number: weekNo,
      notes: notes || null,
      is_holiday: isHoliday,
    })

    setSubmitting(false)
    if (dbError) { setError(dbError.message); return }

    setResult({
      teacher: profile.name,
      center: centerName,
      batch: currentBatch!.name,
      subject: subject || '',
      chapter: ch || 'Holiday',
      lectures,
      weekNo,
      isHoliday,
    })
  }

  function resetForm() {
    setResult(null)
    setSelectedAssignmentId('')
    setSubject('')
    setChapter('')
    setChapterInput('')
    setSubtopics('')
    setLectures(0)
    setNotes('')
    setIsHoliday(false)
    setError('')
  }

  // Pace calculation (instant, client-side)
  const monthKey = getCurrentMonthKey()
  const batchBase = currentBatch?.name.replace(/\s*[–-]\s*\d+.*$/, '').trim() ?? ''
  const plannedThisMonth = subject ? (PLAN[batchBase]?.[subject]?.[monthKey] ?? 0) : 0
  const paceResult = subject && lectures > 0 ? calculatePace(batchBase, subject, monthKey, lectures) : null

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div style={{ background: '#08090A', height: 56, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#08BD80', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 17 }}>U</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Unacademy Nashik</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .5 }}>Weekly Lecture Log</div>
          </div>
        </div>
        <div style={{ padding: 12, maxWidth: 440, margin: '0 auto' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 80, background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', borderRadius: 12, marginBottom: 9, animation: 'skeleton 1.2s infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  // Success screen
  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f0f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#08BD80,#6929C4)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Log Submitted!</h2>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>Your entry is saved. Academic head will track your progress.</p>
          <div style={{ background: '#fff', borderRadius: 11, padding: 16, marginBottom: 16, textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            {[
              ['Teacher', result.teacher],
              ['Center', result.center],
              ['Batch', result.batch],
              ...(result.isHoliday ? [['Status', 'Holiday / No lecture']] : [
                ['Subject', result.subject],
                ['Chapter', result.chapter],
                ['Lectures', String(result.lectures)],
              ]),
              ['Week', `Week ${result.weekNo}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e0e0e0', fontSize: 12 }}>
                <span style={{ color: '#999', fontWeight: 600 }}>{k}</span>
                <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={resetForm} style={{ width: '100%', padding: 14, background: '#08090A', color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + Log Another Subject
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f5', paddingBottom: 24 }}>
      {/* Top bar */}
      <div style={{ background: '#08090A', height: 56, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, position: 'sticky', top: 0, zIndex: 99, boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}>
        <div style={{ width: 34, height: 34, background: '#08BD80', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 17, flexShrink: 0 }}>U</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Unacademy Nashik</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .5 }}>Weekly Lecture Log</div>
        </div>
        <div style={{ background: '#6929C4', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
          Week {weekNo}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(0,0,0,.1)' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#08BD80,#6929C4)', width: `${progress}%`, transition: 'width .35s' }} />
      </div>

      <div style={{ padding: 12, maxWidth: 440, margin: '0 auto' }}>
        {/* Section label */}
        <div style={{ fontSize: 9, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: .8, margin: '16px 0 7px 2px' }}>Your identity</div>

        {/* Batch assignment selector */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #6929C4' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            Your Batch &amp; Subject
            <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: '#fff0f0', color: '#c0392b', border: '1px solid #ffd0d0', textTransform: 'uppercase' }}>required</span>
          </div>
          <select
            value={selectedAssignmentId}
            onChange={e => { setSelectedAssignmentId(e.target.value); setSubject(''); setChapter('') }}
            style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontWeight: 500, background: '#fff', appearance: 'none' }}
          >
            <option value="">— Select your batch —</option>
            {profile?.teacher_batch_assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.batches.name} · {a.subject} ({a.batches.class_level === '11' ? 'Class 11' : 'Class 12'})
              </option>
            ))}
          </select>
          {selectedAssignment && (
            <div style={{ background: '#f0eaff', borderRadius: 8, padding: '9px 12px', marginTop: 8, border: '1px solid rgba(105,41,196,.15)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6929C4' }}>{profile?.name}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                {profile?.centers?.name} · {currentBatch?.name} · {selectedAssignment.subject}
              </div>
            </div>
          )}
        </div>

        {/* Week number */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Week Number</div>
          <div style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>Which academic week? (May 2026 = Week 1)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setWeekNo(w => Math.max(1, w - 1))} style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #e0e0e0', background: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{weekNo}</div>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 600 }}>academic week</div>
            </div>
            <button onClick={() => setWeekNo(w => Math.min(52, w + 1))} style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #e0e0e0', background: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        </div>

        <div style={{ fontSize: 9, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: .8, margin: '16px 0 7px 2px' }}>Lecture details</div>

        {/* Holiday toggle */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>This week&apos;s status</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => setIsHoliday(false)}
              style={{ padding: 11, border: `2px solid ${!isHoliday ? '#08BD80' : '#e0e0e0'}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: !isHoliday ? '#f0fdf8' : '#fff', color: !isHoliday ? '#06a872' : '#555' }}
            >
              ✅ Lectures held
            </button>
            <button
              onClick={() => setIsHoliday(true)}
              style={{ padding: 11, border: `2px solid ${isHoliday ? '#ff832b' : '#e0e0e0'}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: isHoliday ? '#fff8f0' : '#fff', color: isHoliday ? '#8e4800' : '#555' }}
            >
              🟠 Holiday / No class
            </button>
          </div>
        </div>

        {/* Lecture details (hidden when holiday) */}
        {!isHoliday && (
          <>
            {/* Subject */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                Subject
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: '#fff0f0', color: '#c0392b', border: '1px solid #ffd0d0', textTransform: 'uppercase' }}>required</span>
              </div>
              <select
                value={subject}
                onChange={e => { setSubject(e.target.value as Subject); setChapter('') }}
                disabled={!selectedAssignmentId}
                style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontWeight: 500, background: !selectedAssignmentId ? '#f6f6f6' : '#fff', appearance: 'none' }}
              >
                <option value="">{selectedAssignmentId ? '— Select subject —' : '— Select batch first —'}</option>
                {batchSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Chapter */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                Chapter / Topic Covered
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: '#fff0f0', color: '#c0392b', border: '1px solid #ffd0d0', textTransform: 'uppercase' }}>required</span>
              </div>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>Select from list, or type freely below.</div>
              {chaptersLoading ? (
                <div style={{ fontSize: 10, color: '#999', padding: '6px 0', fontWeight: 600 }}>Loading chapters…</div>
              ) : (
                <select
                  value={chapter}
                  onChange={e => setChapter(e.target.value)}
                  disabled={!subject}
                  style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontWeight: 500, background: !subject ? '#f6f6f6' : '#fff', appearance: 'none' }}
                >
                  <option value="">{subject ? '— Select chapter —' : '— Select subject first —'}</option>
                  {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                  {chapters.length > 0 && <option value="__other__">Other / Type below</option>}
                </select>
              )}
              {(chapter === '__other__' || chapters.length === 0) && subject && (
                <input
                  type="text"
                  value={chapterInput}
                  onChange={e => setChapterInput(e.target.value)}
                  placeholder="Type chapter name here…"
                  style={{ marginTop: 7, width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13 }}
                />
              )}
            </div>

            {/* Sub-topics */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                Sub-topics Covered
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(105,41,196,.07)', color: '#6929C4', border: '1px solid rgba(105,41,196,.2)', textTransform: 'uppercase' }}>optional</span>
              </div>
              <textarea
                value={subtopics}
                onChange={e => setSubtopics(e.target.value)}
                placeholder="e.g. Coulomb's Law, Electric Field, Gauss's Law…"
                rows={3}
                style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            {/* Lecture counter */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                Lectures Taken This Week
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: '#fff0f0', color: '#c0392b', border: '1px solid #ffd0d0', textTransform: 'uppercase' }}>required</span>
              </div>
              <div style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>Total lectures for this subject this week.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setLectures(l => Math.max(0, l - 1))} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #e0e0e0', background: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>{lectures}</div>
                  <div style={{ fontSize: 10, color: '#999', fontWeight: 600 }}>lectures</div>
                </div>
                <button onClick={() => setLectures(l => Math.min(30, l + 1))} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #e0e0e0', background: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                <input type="number" min={0} max={30} value={lectures} onChange={e => setLectures(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 60, textAlign: 'center', fontWeight: 700, fontSize: 15, padding: '8px 4px', border: '1.5px solid #e0e0e0', borderRadius: 8 }} />
              </div>

              {/* Pace indicator — instant, no server call */}
              {paceResult && (
                <div style={{
                  marginTop: 10, padding: '9px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600, lineHeight: 1.5, border: '1px solid',
                  ...(paceResult.status === 'on_track' ? { background: '#DEFBE6', color: '#198038', borderColor: '#B0E8C0' }
                    : paceResult.status === 'behind' || paceResult.status === 'slow' ? { background: '#FFF1F1', color: '#A2191F', borderColor: '#FFB0B0' }
                    : { background: '#EEF4FF', color: '#0043CE', borderColor: '#B0C8FF' })
                }}>
                  {paceResult.emoji} {lectures} lectures vs {plannedThisMonth} planned for {monthKey}.{' '}
                  {paceResult.status === 'on_track' ? 'Good pace!' : paceResult.status === 'fast' ? 'Academic head will review pace.' : `${plannedThisMonth - lectures} behind plan — please note below.`}
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 9, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                Notes for Academic Head
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(105,41,196,.07)', color: '#6929C4', border: '1px solid rgba(105,41,196,.2)', textTransform: 'uppercase' }}>optional</span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Students struggling? Pace issue? Extra info?"
                rows={2}
                style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, resize: 'none', lineHeight: 1.5 }}
              />
            </div>
          </>
        )}

        {error && (
          <div style={{ color: '#c0392b', fontSize: 11, fontWeight: 600, padding: 10, background: '#fff0f0', borderRadius: 7, border: '1px solid #ffd0d0', marginBottom: 8 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ width: '100%', padding: 16, background: submitting ? '#ccc' : 'linear-gradient(135deg,#6929C4,#08BD80)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 3px 14px rgba(105,41,196,.3)', letterSpacing: .2 }}
        >
          {submitting ? 'Saving…' : 'Submit Weekly Log →'}
        </button>
      </div>
    </div>
  )
}
