import { ImageOff, Lock } from 'lucide-react'
import { useState } from 'react'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { useI18n } from '@/i18n/LanguageProvider'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './ui/dialog'

/** Private proof photo via short-lived signed URL; click to enlarge. */
export function ProofImage({ path, alt, locked, className }: { path: string | null; alt: string; locked?: boolean; className?: string }) {
  const { t } = useI18n()
  const url = useSignedUrl('proofs', locked ? null : path)
  const [failed, setFailed] = useState(false)
  const box = cn('flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted text-muted-foreground', className)

  if (locked) {
    return (
      <div className={cn(box, 'flex-col gap-2 bg-gradient-to-br from-primary-soft to-gold-soft text-xs')}>
        <Lock className="size-5" aria-hidden />
        <span className="px-4 text-center">{t.common.signInToSeePhotos}</span>
      </div>
    )
  }
  if (!path || failed) {
    return (
      <div className={cn(box, 'flex-col gap-2 text-xs')}>
        <ImageOff className="size-5" aria-hidden />
        {t.common.noPhoto}
      </div>
    )
  }
  if (!url) return <div className={cn(box, 'animate-pulse')} aria-busy />
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={cn(box, 'cursor-zoom-in')} aria-label={alt}>
          <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-3" closeLabel={t.common.close}>
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <img src={url} alt={alt} className="max-h-[80vh] w-full rounded-md object-contain" />
      </DialogContent>
    </Dialog>
  )
}
