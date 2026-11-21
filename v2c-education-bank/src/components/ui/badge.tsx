import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5', {
  variants: {
    variant: {
      default: 'bg-primary-soft text-primary',
      gold: 'bg-gold-soft text-gold-foreground ring-1 ring-gold/40',
      pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
      approved: 'bg-primary-soft text-primary ring-1 ring-primary/20',
      rejected: 'bg-destructive-soft text-destructive ring-1 ring-destructive/20',
      muted: 'bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export const Badge = ({ className, variant, ...p }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) => (
  <span className={cn(badgeVariants({ variant }), className)} {...p} />
)
