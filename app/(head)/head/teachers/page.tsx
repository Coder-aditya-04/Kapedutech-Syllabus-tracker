import { createClient } from '@/lib/supabase/server'
import { CenterBadge } from '@/components/shared/CenterBadge'
import { DeleteTeacherButton } from '@/components/teacher/DeleteTeacherButton'
import Link from 'next/link'

interface TeacherRow {
  id: string; name: string; role: string; employee_id: string | null; center_id: string | null; created_at: string
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
    .select(`id, name, role, employee_id, center_id, created_at,
      centers(name),
      teacher_batch_assignments(id, subject, is_active, batches(name, batch_type, class_level, centers(name)))`)
    .in('role', ['teacher', 'academic_head', 'director'])
    .order('name') as { data: TeacherRow[] | null }

  const all = teachers ?? []

  const avatarColors = [
    'linear-gradient(135deg,#1A73E8,#7C3AED)',
    'linear-gradient(135deg,#7C3AED,#ec4899)',
    'linear-gradient(135deg,#43A047,#1A73E8)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#06b6d4,#43A047)',
    'linear-gradient(135deg,#8b5cf6,#06b6d4)',
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">👨‍🏫 Teachers</h1>
          <p className="text-gray-500 text-base mt-1"><span className="font-semibold text-violet-600">{all.length}</span> teachers registered</p>
        </div>
        <Link
          href="/head/teachers/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' }}
        >
          + Add Teacher
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="rounded-2xl p-16 text-center card-gradient">
          <div className="text-5xl mb-4">👨‍🏫</div>
          <div className="text-2xl font-black text-gray-900">No teachers yet</div>
          <div className="text-gray-500 mt-2">Click &ldquo;Add Teacher&rdquo; to get started</div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 stagger">
          {all.map((teacher, idx) => {
            const assignments  = teacher.teacher_batch_assignments.filter(a => a.is_active)
            const centerName   = teacher.centers?.name
            const initials     = teacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            const avatarGrad   = avatarColors[idx % avatarColors.length]

            const roleLabel = teacher.role === 'director' ? 'Director' : teacher.role === 'academic_head' ? 'Head' : 'Teacher'
            const roleStyle = teacher.role === 'director'
              ? { background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', color: '#16a34a', border: '1px solid rgba(74,222,128,0.4)' }
              : teacher.role === 'academic_head'
              ? { background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#2563eb', border: '1px solid rgba(96,165,250,0.4)' }
              : { background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)' }

            return (
              <div key={teacher.id} className="bg-white rounded-2xl border border-gray-200 p-5 card-lift animate-fade-up flex flex-col gap-4">
                {/* Top row */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black text-white shrink-0 shadow-md"
                    style={{ background: avatarGrad }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-gray-900 text-base leading-tight truncate">{teacher.name}</h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0" style={roleStyle}>{roleLabel}</span>
                    </div>
                    {teacher.employee_id && (
                      <span className="text-xs text-gray-400 font-semibold">{teacher.employee_id}</span>
                    )}
                    {centerName && <div className="mt-1"><CenterBadge name={centerName} /></div>}
                  </div>
                  <div
                    className="shrink-0 text-xs font-black px-3 py-1.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    {assignments.length} {assignments.length === 1 ? 'batch' : 'batches'}
                  </div>
                </div>

                {/* Assignments */}
                <div className="flex-1">
                  {assignments.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No active assignments</p>
                  ) : (
                    <div className="space-y-2">
                      {assignments.filter(a => a.batches).map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-semibold text-gray-700">{a.batches!.name}</span>
                          <span className="text-gray-400 text-xs">· {a.batches!.centers.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-semibold">
                      Joined {new Date(teacher.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                    <DeleteTeacherButton teacherId={teacher.id} teacherName={teacher.name} />
                  </div>
                  <Link
                    href={`/head/teachers/${teacher.id}`}
                    className="text-sm font-bold text-violet-600 hover:text-violet-800 hover:underline transition-colors"
                  >
                    Edit assignments →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
