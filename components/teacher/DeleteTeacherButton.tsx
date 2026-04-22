'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteTeacherButton({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch('/api/delete-teacher', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const { error } = await res.json()
      alert(error ?? 'Failed to delete teacher')
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-semibold">Delete {teacherName}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors border border-transparent hover:border-red-200"
    >
      Delete
    </button>
  )
}
