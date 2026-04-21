import { createClient } from '@/lib/supabase/server'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface TeacherRow {
  id: string; name: string; employee_id: string | null; center_id: string | null; created_at: string
  centers: { name: string } | null
  teacher_batch_assignments: Array<{
    id: string; subject: string; is_active: boolean
    batches: { name: string; batch_type: string; class_level: string; centers: { name: string } } | null
  }>
}

export default async function TeachersPage() {
  const supabase = await createClient()

  const { data: teachers } = await supabase
    .from('user_profiles')
    .select(`
      id, name, employee_id, center_id, created_at,
      centers(name),
      teacher_batch_assignments(
        id, subject, is_active,
        batches(name, batch_type, class_level, centers(name))
      )
    `)
    .eq('role', 'teacher')
    .order('name') as { data: TeacherRow[] | null }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{teachers?.length ?? 0} teachers registered</p>
        </div>
        <Link
          href="/head/teachers/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#6929C4' }}
        >
          + Add Teacher
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(teachers ?? []).map(teacher => {
          const assignments = teacher.teacher_batch_assignments.filter(a => a.is_active)
          const centerName = teacher.centers?.name

          return (
            <Card key={teacher.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">{teacher.name}</CardTitle>
                    {teacher.employee_id && <div className="text-xs text-gray-400 mt-0.5">{teacher.employee_id}</div>}
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold bg-gray-50">
                    {assignments.length} {assignments.length === 1 ? 'subject' : 'subjects'}
                  </Badge>
                </div>
                {centerName && <CenterBadge name={centerName} />}
              </CardHeader>
              <CardContent className="pt-0">
                {assignments.length === 0 ? (
                  <p className="text-sm text-gray-400">No active assignments</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.filter(a => a.batches).map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs">
                        <SubjectBadge subject={a.subject} />
                        <span className="text-gray-600 font-medium">{a.batches!.name}</span>
                        <span className="text-gray-400">· {a.batches!.centers.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <Link
                    href={`/head/teachers/${teacher.id}`}
                    className="text-xs font-semibold text-purple-700 hover:underline"
                  >
                    Edit assignments →
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
