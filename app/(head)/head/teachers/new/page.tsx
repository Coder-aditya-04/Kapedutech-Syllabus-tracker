'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Center { id: string; name: string }

export default function NewTeacherPage() {
  const router = useRouter()
  const supabase = createClient()

  const [centers, setCenters] = useState<Center[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [empId, setEmpId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.from('centers').select('id, name').order('name')
      .then(({ data }) => {
        const list = (data ?? []) as Center[]
        setCenters(list)
        if (list[0]) setCenterId(list[0].id)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/create-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, employee_id: empId, center_id: centerId }),
      })

      let json: { error?: string; success?: boolean } = {}
      try { json = await res.json() } catch { /* non-JSON response */ }

      if (!res.ok) {
        setError(json.error ?? `Server error (${res.status}) — check Vercel logs`)
        return
      }

      setSuccess(`${name} has been added. They can log in immediately with ${email}.`)
      setTimeout(() => router.push('/head/teachers'), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">←</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👨‍🏫 Add New Teacher</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Creates a teacher account that can log in immediately.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Kapil Sir"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teacher@unacademy.com"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Temporary Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Center</label>
              <select
                value={centerId}
                onChange={e => setCenterId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Employee ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={empId}
                onChange={e => setEmpId(e.target.value)}
                placeholder="EMP001"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              {loading ? 'Creating…' : 'Create Teacher'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
