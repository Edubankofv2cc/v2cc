import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return <img src="/v2c-logo.jpg" alt="Village 2 City Club emblem" width={44} height={44} className={cn('size-11 rounded-full object-cover object-top', className)} />
}
