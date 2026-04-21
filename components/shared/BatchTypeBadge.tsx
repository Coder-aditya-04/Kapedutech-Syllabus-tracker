import { Badge } from '@/components/ui/badge'
import { BATCH_TYPE_COLORS } from '@/lib/constants'

const LABELS: Record<string, string> = {
  NEET_EXCEL:  'NEET Excel',
  NEET_GROWTH: 'NEET Growth',
  JEE_EXCEL:   'JEE Excel',
  JEE_GROWTH:  'JEE Growth',
  MHT_CET:     'MHT-CET',
}

export function BatchTypeBadge({ type }: { type: string }) {
  const cls = BATCH_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700'
  return (
    <Badge className={`${cls} text-xs font-bold border-0`}>
      {LABELS[type] ?? type}
    </Badge>
  )
}
