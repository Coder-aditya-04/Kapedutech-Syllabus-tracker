'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function NewTeacherPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [empId, setEmpId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Create auth user via admin (uses service role on server action ideally)
    // For now, create via regular signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Failed to create user')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('user_profiles').insert({
      user_id: authData.user.id,
      name,
      role: 'teacher',
      employee_id: empId || null,
    })

    setLoading(false)
    if (profileError) {
      setError(profileError.message)
      return
    }

    setSuccess(`Teacher ${name} created! They can now log in with ${email}`)
    setTimeout(() => router.push('/head/teachers'), 2000)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Teacher</h1>
        <p className="text-gray-500 text-sm mt-0.5">Create a teacher account. Assign batches after creation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teacher Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Kapil Sir" required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@unacademy.com" required />
            </div>
            <div className="space-y-1">
              <Label>Temporary Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
            </div>
            <div className="space-y-1">
              <Label>Employee ID (optional)</Label>
              <Input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="EMP001" />
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
            {success && <div className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-3">✅ {success}</div>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} style={{ background: '#6929C4' }}>
                {loading ? 'Creating…' : 'Create Teacher'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
