'use client'

import { useState } from 'react'

export function SendReportButton() {
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null)

  async function send() {
    setSending(true)
    setResult(null)
    try {
      const res  = await fetch('/api/monthly-report', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult({ ok: true,  msg: `✅ Report sent to ${json.recipients} recipient(s) — ${json.month}` })
      } else {
        setResult({ ok: false, msg: json.error ?? 'Failed to send report' })
      }
    } catch {
      setResult({ ok: false, msg: 'Network error — please try again' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={send}
        disabled={sending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90 disabled:opacity-50 disabled:scale-100"
        style={{ background: 'linear-gradient(135deg,#43A047,#1A73E8)' }}
      >
        {sending ? '⏳ Sending…' : '📧 Send Monthly Report'}
      </button>
      {result && (
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {result.msg}
        </span>
      )}
    </div>
  )
}
