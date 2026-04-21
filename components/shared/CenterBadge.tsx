import { Badge } from '@/components/ui/badge'
import { CENTER_COLORS } from '@/lib/constants'

export function CenterBadge({ name }: { name: string }) {
  const cls = CENTER_COLORS[name] ?? 'bg-gray-100 text-gray-700 border-gray-300'
  return (
    <Badge variant="outline" className={`${cls} text-xs font-semibold`}>
      📍 {name}
    </Badge>
  )
}
