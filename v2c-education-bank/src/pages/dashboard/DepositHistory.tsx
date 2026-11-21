import { FileText, Receipt, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, Spinner } from '@/components/ui/states'
import { useI18n } from '@/i18n/LanguageProvider'
import { signedUrl, supabase } from '@/lib/supabase'
import type { Deposit } from '@/lib/types'
import { formatDate, formatLKR, formatNumber, itemName } from '@/lib/utils'

export function DepositHistory({ deposits, onChanged }: { deposits: { data?: Deposit[]; loading: boolean }; onChanged: () => void }) {
  const { t, lang } = useI18n()

  async function openReceipt(path: string) {
    const url = await signedUrl('receipts', path, 120)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else toast.error(t.common.error)
  }

  async function withdraw(d: Deposit) {
    if (!window.confirm(t.dashboard.withdrawConfirm)) return
    const { error } = await supabase.from('deposits').delete().eq('id', d.id).eq('status', 'pending')
    if (error) return toast.error(error.message)
    if (d.receipt_image_url) await supabase.storage.from('receipts').remove([d.receipt_image_url])
    onChanged()
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t.dashboard.historyTitle}</CardTitle></CardHeader>
      <CardContent>
        {deposits.loading && !deposits.data ? (
          <Spinner label={t.common.loading} />
        ) : !deposits.data?.length ? (
          <EmptyState icon={Receipt} title={t.dashboard.historyEmpty} />
        ) : (
          <ul className="flex flex-col gap-3">
            {deposits.data.map((d) => (
              <li key={d.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{formatNumber(d.quantity, lang)} × {itemName(d.item_types, lang)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{d.reference_code}</span> · {formatDate(d.created_at, lang)} · {t.payment[d.payment_method]} · {formatLKR(Number(d.total_amount_lkr), lang)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                {d.admin_notes && (
                  <p className="mt-2 rounded bg-muted px-3 py-2 text-sm"><strong>{t.dashboard.adminNote}:</strong> {d.admin_notes}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.receipt_image_url && (
                    <Button variant="ghost" size="sm" onClick={() => openReceipt(d.receipt_image_url!)}><FileText aria-hidden />{t.common.viewReceipt}</Button>
                  )}
                  {d.status === 'pending' && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => withdraw(d)}><Trash2 aria-hidden />{t.dashboard.withdraw}</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
