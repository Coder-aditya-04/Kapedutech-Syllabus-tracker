import { createClient } from '@/lib/supabase/server'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { BatchTypeBadge } from '@/components/shared/BatchTypeBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function BatchesPage() {
  const supabase = await createClient()

  interface BatchRow {
    id: string; name: string; batch_type: string; class_level: string
    is_active: boolean; academic_year: string
    centers: { name: string }
    teacher_batch_assignments: Array<{ id: string; subject: string; is_active: boolean; user_profiles: { name: string } | null }>
  }

  const { data: batches } = await supabase
    .from('batches')
    .select(`
      id, name, batch_type, class_level, is_active, academic_year,
      centers(name),
      teacher_batch_assignments(id, subject, is_active, user_profiles(name))
    `)
    .order('name') as { data: BatchRow[] | null }

  const active = batches?.filter(b => b.is_active) ?? []
  const inactive = batches?.filter(b => !b.is_active) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{active.length} active batches · {inactive.length} inactive</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(batches ?? []).map(batch => {
          const center = batch.centers as { name: string }
          const assignments = (batch.teacher_batch_assignments ?? []).filter((a: { is_active: boolean }) => a.is_active)

          return (
            <Card key={batch.id} className={!batch.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold leading-tight">{batch.name}</CardTitle>
                  <Badge variant={batch.is_active ? 'default' : 'outline'} className="text-[10px] flex-shrink-0">
                    {batch.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <CenterBadge name={center.name} />
                  <BatchTypeBadge type={batch.batch_type} />
                  <Badge variant="outline" className="text-[10px]">Class {batch.class_level}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-gray-500 mb-2 font-medium">Teachers assigned:</div>
                {assignments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No teachers assigned yet</p>
                ) : (
                  <div className="space-y-1">
                    {assignments.map((a: { id: string; subject: string; user_profiles: { name: string } | null }) => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">{a.subject}</span>
                        <span className="text-gray-500">{a.user_profiles?.name ?? 'Unassigned'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 mt-3 pt-2 border-t">{batch.academic_year}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
