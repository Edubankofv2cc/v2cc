import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...p }: ComponentProps<'div'>) => (
  <div className={cn('rounded-lg border border-border bg-surface shadow-[0_1px_2px_rgba(28,42,34,0.05)]', className)} {...p} />
)
export const CardHeader = ({ className, ...p }: ComponentProps<'div'>) => (
  <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...p} />
)
export const CardTitle = ({ className, ...p }: ComponentProps<'h3'>) => (
  <h3 className={cn('text-lg font-semibold leading-snug', className)} {...p} />
)
export const CardDescription = ({ className, ...p }: ComponentProps<'p'>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...p} />
)
export const CardContent = ({ className, ...p }: ComponentProps<'div'>) => <div className={cn('p-5 pt-0', className)} {...p} />
