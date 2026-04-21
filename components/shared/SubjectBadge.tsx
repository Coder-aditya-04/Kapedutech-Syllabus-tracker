import { Badge } from '@/components/ui/badge'
import { SUBJECT_COLORS } from '@/lib/constants'

export function SubjectBadge({ subject }: { subject: string }) {
  const cls = SUBJECT_COLORS[subject] ?? 'bg-gray-100 text-gray-700 border-gray-300'
  return (
    <Badge variant="outline" className={`${cls} text-xs font-semibold`}>
      {subject}
    </Badge>
  )
}
