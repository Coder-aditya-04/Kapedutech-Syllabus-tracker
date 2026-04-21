import { Badge } from '@/components/ui/badge'
import type { PaceStatus } from '@/lib/supabase/types'

const CONFIG: Record<PaceStatus, { label: string; emoji: string; className: string }> = {
  no_entry: { label: 'No Entry',    emoji: '⚪', className: 'bg-gray-100 text-gray-600 border-gray-300' },
  behind:   { label: 'Behind',      emoji: '🔴', className: 'bg-red-50 text-red-700 border-red-300' },
  slow:     { label: 'Slightly Slow', emoji: '🟡', className: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  on_track: { label: 'On Track',    emoji: '🟢', className: 'bg-green-50 text-green-700 border-green-300' },
  fast:     { label: 'Too Fast',    emoji: '🔵', className: 'bg-blue-50 text-blue-700 border-blue-300' },
}

export function PaceStatusBadge({ status, showPercent, percent }: {
  status: PaceStatus
  showPercent?: boolean
  percent?: number
}) {
  const c = CONFIG[status]
  return (
    <Badge variant="outline" className={`${c.className} font-semibold text-xs`}>
      {c.emoji} {c.label}{showPercent && percent !== undefined ? ` (${percent}%)` : ''}
    </Badge>
  )
}
