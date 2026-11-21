import * as T from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Tabs = T.Root
export const TabsList = ({ className, ...p }: ComponentProps<typeof T.List>) => (
  <T.List
    className={cn('flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1 [scrollbar-width:none]', className)}
    {...p}
  />
)
export const TabsTrigger = ({ className, ...p }: ComponentProps<typeof T.Trigger>) => (
  <T.Trigger
    className={cn(
      'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors cursor-pointer data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm [&_svg]:size-4',
      className,
    )}
    {...p}
  />
)
export const TabsContent = ({ className, ...p }: ComponentProps<typeof T.Content>) => (
  <T.Content className={cn('mt-5 focus-visible:outline-none', className)} {...p} />
)
