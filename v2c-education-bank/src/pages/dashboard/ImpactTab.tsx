import { GraduationCap, MapPin, School } from 'lucide-react'
import { ProofImage } from '@/components/ProofImage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, Spinner } from '@/components/ui/states'
import { useI18n } from '@/i18n/LanguageProvider'
import type { Distribution } from '@/lib/types'
import { formatDate, formatNumber, itemName } from '@/lib/utils'

export function ImpactTab({ distributions }: { distributions: { data?: Distribution[]; loading: boolean } }) {
  const { t, lang } = useI18n()
  if (distributions.loading && !distributions.data) return <Spinner label={t.common.loading} />
  const list = distributions.data ?? []
  if (!list.length) return <EmptyState icon={School} title={t.dashboard.impactEmpty} />
  const withPhotos = list.filter((d) => d.photo_proof_url)

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.impactTitle}</CardTitle>
          <CardDescription>{t.dashboard.impactLead}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative ml-3 border-l-2 border-primary/25">
            {list.map((d) => (
              <li key={d.id} className="relative mb-6 pl-6 last:mb-0">
                <span className="absolute -left-[9px] top-1 size-4 rounded-full border-2 border-surface bg-primary" aria-hidden />
                <p className="text-xs font-semibold text-primary">{formatDate(d.distributed_at, lang)}</p>
                <p className="mt-0.5 font-semibold">{formatNumber(d.quantity, lang)} × {itemName(d.item_types, lang)}</p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><School className="size-3.5" aria-hidden />{d.school_name}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{d.village_name}{d.district ? `, ${d.district}` : ''}</span>
                  <span className="inline-flex items-center gap-1"><GraduationCap className="size-3.5" aria-hidden />{t.dashboard.studentsReached(d.students_reached)}{d.student_grade ? ` · ${t.common.grade} ${d.student_grade}` : ''}</span>
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {withPhotos.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold">{t.dashboard.galleryTitle}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {withPhotos.map((d) => (
              <figure key={d.id} className="overflow-hidden rounded-lg border border-border bg-surface">
                <ProofImage path={d.photo_proof_url} alt={`${itemName(d.item_types, lang)} — ${d.school_name}`} />
                <figcaption className="p-2 text-xs text-muted-foreground">{d.school_name} · {formatDate(d.distributed_at, lang)}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
