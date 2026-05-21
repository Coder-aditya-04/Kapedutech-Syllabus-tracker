'use client'
import { useState } from 'react'
import { CenterBadge } from '@/components/shared/CenterBadge'

interface Teacher { id: string; name: string; center_id: string | null }
interface Center  { id: string; name: string }

interface Props {
  pendingTeachers: Teacher[]
  centers: Center[]
  currentWeek: number
}

export function PendingTeachersCard({ pendingTeachers, centers, currentWeek }: Props) {
  const [sending, setSending]   = useState<string | null>(null)
  const [sent, setSent]         = useState<Set<string>>(new Set())
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [sendingAll, setSendingAll] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportSending, setReportSending] = useState(false)

  const knownCenterIds = new Set(centers.map(c => c.id))
  const ungrouped = pendingTeachers.filter(t => !t.center_id || !knownCenterIds.has(t.center_id))
  const groups: { id: string; name: string; teachers: Teacher[] }[] = [
    ...centers
      .map(c => ({ id: c.id, name: c.name, teachers: pendingTeachers.filter(t => t.center_id === c.id) }))
      .filter(g => g.teachers.length > 0),
    ...(ungrouped.length > 0 ? [{ id: 'ungrouped', name: 'Other', teachers: ungrouped }] : []),
  ]

  async function sendWarning(teacherId: string) {
    setSending(teacherId)
    setErrors(prev => { const n = { ...prev }; delete n[teacherId]; return n })
    const res = await fetch('/api/send-warning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId }),
    })
    if (res.ok) {
      setSent(prev => { const next = new Set(Array.from(prev)); next.add(teacherId); return next })
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Failed' }))
      setErrors(prev => ({ ...prev, [teacherId]: error ?? 'Failed' }))
    }
    setSending(null)
  }

  async function sendAllWarnings() {
    setSendingAll(true)
    const pending = pendingTeachers.filter(t => !sent.has(t.id))
    for (const t of pending) {
      await sendWarning(t.id)
    }
    setSendingAll(false)
  }

  async function sendWeeklyReport() {
    setReportSending(true)
    const res = await fetch('/api/send-digest', { method: 'POST' })
    if (res.ok) setReportSent(true)
    setReportSending(false)
  }

  const unsentPending = pendingTeachers.filter(t => !sent.has(t.id))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
        <div>
          <h2 className="text-base font-black text-gray-900">⚠️ Log Not Submitted — Week {currentWeek}</h2>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">Teachers with active batches who haven&apos;t submitted any log this week</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Send weekly report button */}
          <button
            onClick={sendWeeklyReport}
            disabled={reportSending || reportSent}
            className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all disabled:opacity-50"
            style={{ background: reportSent ? '#dcfce7' : '#fff', color: reportSent ? '#166534' : '#1A73E8', borderColor: reportSent ? '#86efac' : '#1A73E8' }}
          >
            {reportSending ? '⏳ Sending…' : reportSent ? '✅ Report Sent' : '📊 Send Weekly Report'}
          </button>

          <span className={`text-sm font-black px-3 py-1 rounded-full ${pendingTeachers.length === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {pendingTeachers.length === 0 ? '✅ All submitted' : `${pendingTeachers.length} pending`}
          </span>
        </div>
      </div>

      {pendingTeachers.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <p className="font-bold text-green-700">All teachers have submitted their log this week!</p>
        </div>
      ) : (
        <div className="p-5">
          {/* Send all button */}
          {unsentPending.length > 1 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={sendAllWarnings}
                disabled={sendingAll}
                className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)' }}
              >
                {sendingAll ? '⏳ Sending warnings…' : `⚠️ Warn All ${unsentPending.length} Teachers`}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
                <div key={group.id} className="rounded-xl border border-red-100 bg-red-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CenterBadge name={group.name} />
                    <span className="text-xs font-black text-red-600 ml-auto">
                      {group.teachers.filter(t => !sent.has(t.id)).length} pending
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.teachers.map(t => {
                      const isSent    = sent.has(t.id)
                      const isSending = sending === t.id
                      const errMsg    = errors[t.id]
                      return (
                        <div key={t.id}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${isSent ? 'bg-green-50 border-green-200' : 'bg-white border-red-100'}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                            style={{ background: isSent ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#f97316)' }}>
                            {t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-gray-800">{t.name}</span>
                            {errMsg && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errMsg}</p>}
                          </div>
                          {isSent ? (
                            <span className="text-[10px] font-bold text-green-600 shrink-0">✅ Warned</span>
                          ) : (
                            <button
                              onClick={() => sendWarning(t.id)}
                              disabled={isSending || sendingAll}
                              className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              {isSending ? '⏳…' : '⚠️ Warn'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
