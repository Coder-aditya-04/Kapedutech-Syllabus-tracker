import { createClient } from '@/lib/supabase/server'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { SendReportButton } from '@/components/shared/SendReportButton'

export const revalidate = 0

interface MsgRow {
  id: string
  notes: string
  submitted_at: string
  week_number: number
  subject: string
  chapter_name: string
  user_profiles: { name: string; employee_id: string | null } | null
  batches: { name: string; centers: { name: string } } | null
}

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('weekly_logs')
    .select(`id, notes, submitted_at, week_number, subject, chapter_name,
      user_profiles(name, employee_id),
      batches(name, centers(name))`)
    .not('notes', 'is', null)
    .neq('notes', '')
    .order('submitted_at', { ascending: false })
    .limit(200) as { data: MsgRow[] | null }

  const msgs = (data ?? []).filter(m => {
    const note = m.notes?.trim() ?? ''
    // skip auto-generated completion notes
    return note && note !== '✅ Chapter completed.'
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">💬 Messages</h1>
          <p className="text-gray-500 text-base mt-1">
            Notes left by teachers in their weekly logs —{' '}
            <span className="font-semibold text-violet-600">{msgs.length}</span> messages
          </p>
        </div>
        <SendReportButton />
      </div>

      {msgs.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
          <div className="text-5xl mb-4">💬</div>
          <div className="text-2xl font-black text-gray-900">No messages yet</div>
          <div className="text-gray-500 mt-2">Teachers can leave notes in their weekly log submissions</div>
        </div>
      ) : (
        <div className="space-y-4">
          {msgs.map(m => {
            const teacher = m.user_profiles
            const batch   = m.batches
            const initials = teacher?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'
            const date = new Date(m.submitted_at).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
            })
            const time = new Date(m.submitted_at).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
            })

            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-5 card-lift flex gap-4">
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}
                >
                  {initials}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div>
                      <span className="font-black text-gray-900">{teacher?.name ?? 'Unknown'}</span>
                      {teacher?.employee_id && (
                        <span className="ml-2 text-xs text-gray-400 font-semibold">{teacher.employee_id}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-semibold shrink-0">
                      {date} · {time} · Week {m.week_number}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {batch && <CenterBadge name={batch.centers.name} />}
                    <span className="text-xs font-semibold text-gray-500">{batch?.name}</span>
                    <SubjectBadge subject={m.subject} />
                    <span className="text-xs text-gray-400 font-medium truncate">{m.chapter_name}</span>
                  </div>

                  {/* Message bubble */}
                  <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
                    {m.notes}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
