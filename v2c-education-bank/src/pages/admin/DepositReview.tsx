import { CheckCircle2, FileText, Loader2, MessageCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { EmptyState, Spinner } from '@/components/ui/states'
import { unwrap, useQuery } from '@/hooks/useQuery'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { Deposit } from '@/lib/types'
import { formatDate, formatLKR, formatNumber, itemName } from '@/lib/utils'

function ReceiptPreview({ path }: { path: string | null }) {
  const { t } = useI18n()
  const url = useSignedUrl('receipts', path)
  if (!path) return <p className="rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">{t.admin.noReceipt}</p>
  if (!url) return <Spinner label={t.common.loading} />
  if (path.toLowerCase().endsWith('.pdf')) {
    return (
      <div className="flex flex-col gap-2">
        <iframe src={url} title={t.admin.receiptPreview} className="h-[60vh] w-full rounded-md border border-border" />
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{t.common.viewReceipt}</a>
      </div>
    )
  }
  return <img src={url} alt={t.admin.receiptPreview} className="max-h-[60vh] w-full rounded-md object-contain" />
}

export function DepositReview({ onChanged }: { onChanged: () => void }) {
  const { t, lang } = useI18n()
  const [showReviewed, setShowReviewed] = useState(false)
  const [active, setActive] = useState<Deposit | null>(null)
  const [mode, setMode] = useState<'view' | 'reject'>('view')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const list = useQuery(async () => {
    let q = supabase
      .from('deposits')
      .select('*, item_types(name_en, name_ta, slug), profiles(full_name, email, whatsapp_number, district)')
      .order('created_at', { ascending: showReviewed ? false : true })
      .limit(200)
    q = showReviewed ? q.neq('status', 'pending') : q.eq('status', 'pending')
    return unwrap(await q) as Deposit[]
  }, [showReviewed])

  async function review(d: Deposit, approve: boolean) {
    setBusy(true)
    const { error } = await supabase.rpc('review_deposit', { _deposit_id: d.id, _approve: approve, _notes: approve ? null : reason })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success(approve ? t.admin.approved : t.admin.rejected)
    setActive(null); setReason(''); setMode('view')
    void list.reload(); onChanged()
  }

  const open = (d: Deposit, m: 'view' | 'reject' = 'view') => { setActive(d); setMode(m); setReason('') }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t.admin.pendingTitle}</CardTitle>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} />
          {t.admin.showReviewed}
        </label>
      </CardHeader>
      <CardContent>
        {list.loading && !list.data ? <Spinner label={t.common.loading} /> : !list.data?.length ? (
          <EmptyState icon={CheckCircle2} title={t.admin.pendingEmpty} />
        ) : (
          <ul className="flex flex-col gap-3">
            {list.data.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{formatNumber(d.quantity, lang)} × {itemName(d.item_types, lang)}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-sm">{d.profiles?.full_name || d.profiles?.email} {d.profiles?.district && <span className="text-muted-foreground">· {d.profiles.district}</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{d.reference_code}</span>{d.bank_reference && <> · {t.common.reference}: <span className="font-mono">{d.bank_reference}</span></>} · {t.payment[d.payment_method]} · {formatLKR(Number(d.total_amount_lkr), lang)} · {formatDate(d.created_at, lang)}
                  </p>
                  {d.admin_notes && <p className="mt-1 text-xs italic text-muted-foreground">{d.admin_notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.profiles?.whatsapp_number && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={`https://wa.me/${d.profiles.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => open(d)}><FileText aria-hidden />{t.common.viewReceipt}</Button>
                  {d.status === 'pending' && (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => review(d, true)}><CheckCircle2 aria-hidden />{t.admin.approve}</Button>
                      <Button size="sm" variant="destructive" onClick={() => open(d, 'reject')}><XCircle aria-hidden />{t.admin.reject}</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        {active && (
          <DialogContent className="max-w-2xl" closeLabel={t.common.close}>
            <DialogHeader>
              <DialogTitle>{formatNumber(active.quantity, lang)} × {itemName(active.item_types, lang)} — <span className="font-mono">{active.reference_code}</span></DialogTitle>
              <DialogDescription>{active.profiles?.full_name} · {formatLKR(Number(active.total_amount_lkr), lang)} · {t.payment[active.payment_method]}</DialogDescription>
            </DialogHeader>
            <ReceiptPreview path={active.receipt_image_url} />
            {mode === 'reject' && (
              <Field label={t.admin.rejectReason} htmlFor="reason" hint={t.admin.rejectReasonHint} required>
                <Textarea id="reason" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} autoFocus />
              </Field>
            )}
            {active.status === 'pending' && (
              <DialogFooter>
                {mode === 'view' ? (
                  <>
                    <Button variant="destructive" onClick={() => setMode('reject')}><XCircle aria-hidden />{t.admin.reject}</Button>
                    <Button disabled={busy} onClick={() => review(active, true)}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 aria-hidden />}{t.admin.approve}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setMode('view')}>{t.common.cancel}</Button>
                    <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => review(active, false)}>{busy && <Loader2 className="animate-spin" />}{t.admin.reject}</Button>
                  </>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </Card>
  )
}
