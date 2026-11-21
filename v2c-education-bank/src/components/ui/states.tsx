import { Loader2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({ icon: Icon, title, children, className }: { icon: LucideIcon; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

export function Spinner({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label}
    </div>
  )
}
