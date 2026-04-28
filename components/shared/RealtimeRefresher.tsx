'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Subscribes to key tables via Supabase Realtime and calls router.refresh()
// whenever any row is inserted, updated, or deleted — so server components
// re-render with fresh data automatically for every user on the page.
export function RealtimeRefresher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('global-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_logs' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_batch_assignments' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => router.refresh())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  return null
}
