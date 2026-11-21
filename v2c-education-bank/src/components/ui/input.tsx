import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-md border border-border bg-surface px-3 text-sm shadow-xs placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 aria-invalid:border-destructive'

export const Input = ({ className, ...p }: ComponentProps<'input'>) => <input className={cn(field, 'h-10', className)} {...p} />
export const Textarea = ({ className, ...p }: ComponentProps<'textarea'>) => (
  <textarea className={cn(field, 'min-h-24 py-2', className)} {...p} />
)
export const NativeSelect = ({ className, ...p }: ComponentProps<'select'>) => (
  <select className={cn(field, 'h-10 pr-8', className)} {...p} />
)
