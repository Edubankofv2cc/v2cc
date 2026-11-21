import * as D from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

export function DialogContent({
  className, children, closeLabel = 'Close', ...p
}: ComponentProps<typeof D.Content> & { closeLabel?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
      <D.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-xl',
          className,
        )}
        {...p}
      >
        {children}
        <D.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" aria-label={closeLabel}>
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  )
}
export const DialogHeader = ({ className, ...p }: ComponentProps<'div'>) => <div className={cn('flex flex-col gap-1.5 pr-6', className)} {...p} />
export const DialogFooter = ({ className, ...p }: ComponentProps<'div'>) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...p} />
)
export const DialogTitle = ({ className, ...p }: ComponentProps<typeof D.Title>) => (
  <D.Title className={cn('text-lg font-semibold', className)} {...p} />
)
export const DialogDescription = ({ className, ...p }: ComponentProps<typeof D.Description>) => (
  <D.Description className={cn('text-sm text-muted-foreground', className)} {...p} />
)

/** Mobile slide-in panel built on the dialog primitive */
export function SheetContent({ className, children, closeLabel = 'Close', ...p }: ComponentProps<typeof D.Content> & { closeLabel?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <D.Content
        className={cn('fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col gap-2 bg-surface p-6 shadow-xl', className)}
        {...p}
      >
        {children}
        <D.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" aria-label={closeLabel}>
          <X className="size-5" />
        </D.Close>
      </D.Content>
    </D.Portal>
  )
}
