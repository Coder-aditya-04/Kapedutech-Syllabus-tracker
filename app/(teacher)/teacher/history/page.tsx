import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PaceStatusBadge } from '@/components/shared/PaceStatusBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { calculatePace, MONTHS } from '@/lib/pace'

export default async function TeacherHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  interface LogRow {
    id: string; subject: string; chapter_name: string; lectures_this_week: number
    week_number: number; is_holiday: boolean; notes: string | null; submitted_at: string
    batches: { name: string; batch_type: string; class_level: string; centers: { name: string } } | null
  }

  const { data: logs } = await supabase
    .from('weekly_logs')
    .select(`
      id, subject, chapter_name, lectures_this_week, week_number, is_holiday,
      notes, submitted_at,
      batches(name, batch_type, class_level, centers(name))
    `)
    .eq('teacher_id', profile.id)
    .order('submitted_at', { ascending: false })
    .limit(50) as { data: LogRow[] | null }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f5', paddingBottom: 24 }}>
      {/* Top bar */}
      <div style={{ background: '#08090A', height: 56, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, position: 'sticky', top: 0, zIndex: 99 }}>
        <Link href="/teacher/log" style={{ width: 34, height: 34, background: '#08BD80', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 17, textDecoration: 'none', flexShrink: 0 }}>U</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>My History</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .5 }}>Past Submissions</div>
        </div>
        <Link href="/teacher/log" style={{ background: '#6929C4', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 20, textDecoration: 'none' }}>
          + Log New
        </Link>
      </div>

      <div style={{ padding: 12, maxWidth: 440, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 12, marginTop: 8 }}>
          {logs?.length ?? 0} entries · {profile.name}
        </div>

        {!logs?.length ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#999', fontSize: 13 }}>
            No submissions yet. Log your first week!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {logs.map(log => {
              const batch = log.batches!
              const monthIdx = new Date(log.submitted_at).getMonth()
              const monthKey = MONTHS[monthIdx]
              const batchBase = batch.name.replace(/\s*[–-]\s*\d+.*$/, '').trim()
              const pace = log.is_holiday ? null : calculatePace(batchBase, log.subject, monthKey, log.lectures_this_week)

              return (
                <div key={log.id} style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1.5px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#999', textTransform: 'uppercase', marginBottom: 2 }}>Week {log.week_number}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{log.is_holiday ? '🟠 Holiday' : log.chapter_name}</div>
                    </div>
                    {pace && <PaceStatusBadge status={pace.status} />}
                  </div>

                  {!log.is_holiday && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      <SubjectBadge subject={log.subject} />
                      <span style={{ fontSize: 11, color: '#555', fontWeight: 600, background: '#f0f0f5', padding: '2px 8px', borderRadius: 20 }}>{batch.name}</span>
                      <span style={{ fontSize: 11, color: '#555', fontWeight: 600, background: '#f0f0f5', padding: '2px 8px', borderRadius: 20 }}>📍 {batch.centers?.name}</span>
                      <span style={{ fontSize: 11, color: '#555', fontWeight: 600, background: '#f0f0f5', padding: '2px 8px', borderRadius: 20 }}>📚 {log.lectures_this_week} lectures</span>
                    </div>
                  )}

                  {log.notes && (
                    <div style={{ fontSize: 11, color: '#555', background: '#fffbf0', padding: '6px 10px', borderRadius: 6, marginTop: 4 }}>
                      💬 {log.notes}
                    </div>
                  )}

                  <div style={{ fontSize: 10, color: '#bbb', marginTop: 6 }}>
                    {new Date(log.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
