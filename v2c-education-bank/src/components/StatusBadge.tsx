import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useI18n } from '@/i18n/LanguageProvider'
import type { DepositStatus } from '@/lib/types'
import { Badge } from './ui/badge'

export function StatusBadge({ status }: { status: DepositStatus }) {
  const { t } = useI18n()
  const Icon = status === 'approved' ? CheckCircle2 : status === 'rejected' ? XCircle : Clock
  return (
    <Badge variant={status}>
      <Icon aria-hidden />
      {t.status[status]}
    </Badge>
  )
}
