import { createClient } from '@/lib/supabase/server'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function MentorshipPage() {
  const supabase = await createClient()

  interface MentorshipRow {
    id: string; notes: string | null; assigned_at: string; is_active: boolean
    user_profiles: { name: string; employee_id: string | null } | null
    batches: { id?: string; name: string; batch_type: string; class_level: string; centers: { name: string } } | null
  }
  interface BatchRow { id: string; name: string; batch_type: string; class_level: string; centers: { name: string } }

  const { data: mentorships } = await supabase
    .from('mentorships')
    .select(`
      id, notes, assigned_at, is_active,
      user_profiles(name, employee_id),
      batches(name, batch_type, class_level, centers(name))
    `)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false }) as { data: MentorshipRow[] | null }

  const { data: batches } = await supabase
    .from('batches')
    .select('id, name, batch_type, class_level, centers(name)')
    .eq('is_active', true) as { data: BatchRow[] | null }

  const assignedBatchIds = new Set(mentorships?.map(m => m.batches?.id).filter(Boolean))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mentorship</h1>
        <p className="text-gray-500 text-sm mt-0.5">{mentorships?.length ?? 0} active mentorships assigned</p>
      </div>

      {/* Active mentorships */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
        {(mentorships ?? []).map(m => {
          const mentor = m.user_profiles as { name: string; employee_id: string | null }
          const batch = m.batches as { name: string; batch_type: string; class_level: string; centers: { name: string } }

          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">{batch.name}</CardTitle>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <CenterBadge name={batch.centers.name} />
                  <BatchTypeBadge type={batch.batch_type} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                    {mentor.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{mentor.name}</div>
                    {mentor.employee_id && <div className="text-xs text-gray-400">{mentor.employee_id}</div>}
                  </div>
                  <Badge variant="outline" className="ml-auto text-[10px] bg-green-50 text-green-700 border-green-200">Mentor</Badge>
                </div>
                {m.notes && (
                  <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">{m.notes}</div>
                )}
                <div className="text-[10px] text-gray-400 mt-2">
                  Assigned {new Date(m.assigned_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Batches without mentors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batches Without Mentor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(batches ?? [])
              .filter(b => !assignedBatchIds.has(b.id))
              .map(b => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span className="font-medium text-sm flex-1">{b.name}</span>
                  <CenterBadge name={(b.centers as { name: string }).name} />
                  <BatchTypeBadge type={b.batch_type} />
                  <span className="text-xs text-gray-400">No mentor</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
