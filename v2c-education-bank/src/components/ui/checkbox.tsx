import * as C from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Checkbox = ({ className, ...p }: ComponentProps<typeof C.Root>) => (
  <C.Root
    className={cn(
      'peer size-4 shrink-0 rounded-[4px] border border-border bg-surface data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white cursor-pointer',
      className,
    )}
    {...p}
  >
    <C.Indicator className="flex items-center justify-center">
      <Check className="size-3.5" strokeWidth={3} />
    </C.Indicator>
  </C.Root>
)
