import * as P from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

export function Progress({ value, className, indicatorClassName, label }: { value: number; className?: string; indicatorClassName?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <P.Root value={v} aria-label={label} className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <P.Indicator className={cn('h-full bg-primary transition-all', indicatorClassName)} style={{ width: `${v}%` }} />
    </P.Root>
  )
}
