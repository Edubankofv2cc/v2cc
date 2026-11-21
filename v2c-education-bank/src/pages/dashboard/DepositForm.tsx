import { Building2, Check, Copy, Loader2, Minus, Plus, Truck, Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/states'
import { useItemTypes, useSettings } from '@/hooks/useCatalog'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase, uploadPrivateFile } from '@/lib/supabase'
import type { PaymentMethod } from '@/lib/types'
import { cn, formatLKR, itemName } from '@/lib/utils'

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 font-mono text-sm font-semibold">
        {value}
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`${t.common.copy} ${label}`}
          onClick={() => { void navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500) }}
        >
          {done ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        </button>
      </dd>
    </div>
  )
}

export function DepositForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const items = useItemTypes()
  const { data: settings } = useSettings()
  const [chosenItem, setItemId] = useState('')
  const [qty, setQty] = useState(6)
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [bankRef, setBankRef] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const itemId = chosenItem || items.data?.[0]?.id || ''
  const item = items.data?.find((i) => i.id === itemId)
  const total = item ? Number(item.unit_price_lkr) * qty : 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!item || !user) return
    if (method === 'bank_transfer' && !file) return toast.error(t.dashboard.receiptRequired)
    setBusy(true)
    try {
      const receipt = file ? await uploadPrivateFile('receipts', user.id, file) : null
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          donor_id: user.id, item_type_id: item.id, quantity: qty, payment_method: method,
          bank_reference: bankRef.trim() || null, receipt_image_url: receipt,
        })
        .select('reference_code')
        .single()
      if (error) throw error
      toast.success(t.dashboard.depositSubmitted(data.reference_code), { duration: 8000 })
      setFile(null); setBankRef('')
      onSubmitted()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      toast.error(msg === 'file_too_large' || msg === 'unsupported_file' ? t.dashboard.receiptHint : msg || t.common.error)
    } finally {
      setBusy(false)
    }
  }

  if (items.loading && !items.data) return <Spinner label={t.common.loading} />

  return (
    <form onSubmit={submit} className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.depositTitle}</CardTitle>
          <CardDescription>{t.dashboard.depositLead}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field label={t.common.item} htmlFor="item" required>
            <NativeSelect id="item" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              {items.data?.map((i) => (
                <option key={i.id} value={i.id}>{itemName(i, lang)} — {formatLKR(Number(i.unit_price_lkr), lang)} {t.dashboard.unitPrice}</option>
              ))}
            </NativeSelect>
          </Field>

          <Field label={t.common.quantity} htmlFor="qty" required>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−1"><Minus /></Button>
              <Input id="qty" type="number" inputMode="numeric" min={1} max={10000} required className="w-28 text-center text-lg font-semibold" value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(10000, Math.floor(Number(e.target.value) || 1))))} />
              <Button type="button" variant="outline" size="icon" onClick={() => setQty((q) => Math.min(10000, q + 1))} aria-label="+1"><Plus /></Button>
            </div>
          </Field>

          <div className="rounded-md bg-primary-soft p-4">
            <p className="text-sm text-muted-foreground">{t.dashboard.estimatedCost}</p>
            <p className="font-display text-3xl font-bold text-primary tabular-nums" aria-live="polite">{formatLKR(total, lang)}</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t.dashboard.paymentMethod}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['bank_transfer', 'physical_delivery'] as const).map((m) => {
                const Icon = m === 'bank_transfer' ? Building2 : Truck
                return (
                  <label key={m} className={cn('flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm', method === m ? 'border-primary bg-primary-soft' : 'border-border')}>
                    <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-primary" />
                    <Icon className="size-4 text-primary" aria-hidden />
                    {t.payment[m]}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <Field label={t.dashboard.bankReference} htmlFor="bankref" hint={t.common.optional}>
            <Input id="bankref" maxLength={120} value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
          </Field>

          <Field label={t.dashboard.receipt} htmlFor="receipt" hint={t.dashboard.receiptHint} required={method === 'bank_transfer'}>
            <label htmlFor="receipt" className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm hover:bg-muted">
              <Upload className="size-5 text-primary" aria-hidden />
              <span className="truncate">{file ? file.name : t.dashboard.receipt}</span>
            </label>
            <input id="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>

          <Button type="submit" size="lg" disabled={busy || !item}>
            {busy && <Loader2 className="animate-spin" />}{t.dashboard.submitDeposit}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        {method === 'bank_transfer' ? (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" aria-hidden />{t.dashboard.bankTitle}</CardTitle></CardHeader>
            <CardContent>
              {settings && (
                <dl className="divide-y divide-border">
                  <CopyRow label={t.dashboard.bankName} value={settings.bank_name} />
                  <CopyRow label={t.dashboard.branch} value={settings.bank_branch} />
                  <CopyRow label={t.dashboard.accountName} value={settings.account_name} />
                  <CopyRow label={t.dashboard.accountNumber} value={settings.account_number} />
                  {settings.swift_code && <CopyRow label={t.dashboard.swift} value={settings.swift_code} />}
                  <CopyRow label={t.common.amount} value={formatLKR(total, 'en')} />
                </dl>
              )}
              <p className="mt-3 rounded-md bg-gold-soft p-3 text-xs text-gold-foreground">{t.dashboard.referenceAfter}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="size-5 text-primary" aria-hidden />{t.dashboard.dropOffTitle}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">{lang === 'ta' ? settings?.physical_drop_off_ta : settings?.physical_drop_off_en}</p>
              {settings && <p className="mt-2 text-sm font-semibold">WhatsApp: {settings.contact_whatsapp}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  )
}
