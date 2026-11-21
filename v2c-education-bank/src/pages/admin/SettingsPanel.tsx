import { Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/states'
import { useItemTypes, useSettings } from '@/hooks/useCatalog'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { AppSettings, ItemType } from '@/lib/types'

export function SettingsPanel() {
  const { t } = useI18n()
  const settings = useSettings()
  const items = useItemTypes(true)
  const [form, setForm] = useState<AppSettings | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (settings.data) setForm(settings.data) }, [settings.data])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    const { error } = await supabase.from('app_settings').update({
      membership_threshold: form.membership_threshold, bank_name: form.bank_name, bank_branch: form.bank_branch,
      account_name: form.account_name, account_number: form.account_number, swift_code: form.swift_code || null,
      physical_drop_off_en: form.physical_drop_off_en, physical_drop_off_ta: form.physical_drop_off_ta,
      contact_whatsapp: form.contact_whatsapp, contact_email: form.contact_email,
    }).eq('id', true)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success(t.admin.settingsSaved)
  }

  async function updateItem(item: ItemType, patch: Partial<ItemType>) {
    const { error } = await supabase.from('item_types').update(patch).eq('id', item.id)
    if (error) return toast.error(error.message)
    toast.success(t.common.saved)
    void items.reload()
  }

  if (!form) return <Spinner label={t.common.loading} />
  const text = (k: keyof AppSettings, label: string, type = 'text') => (
    <Field label={label} htmlFor={`s-${k}`}>
      <Input id={`s-${k}`} type={type} value={(form[k] as string | null) ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </Field>
  )

  return (
    <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{t.admin.settingsTitle}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label={t.admin.threshold} htmlFor="s-threshold" className="sm:col-span-2">
              <Input id="s-threshold" type="number" min={1} max={1000} required value={form.membership_threshold}
                onChange={(e) => setForm({ ...form, membership_threshold: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
            </Field>
            {text('bank_name', t.dashboard.bankName)}
            {text('bank_branch', t.dashboard.branch)}
            {text('account_name', t.dashboard.accountName)}
            {text('account_number', t.dashboard.accountNumber)}
            {text('swift_code', t.dashboard.swift)}
            {text('contact_whatsapp', 'WhatsApp', 'tel')}
            {text('contact_email', t.auth.email, 'email')}
            <div className="sm:col-span-2">{text('physical_drop_off_en', `${t.dashboard.dropOffTitle} (English)`)}</div>
            <div className="sm:col-span-2">{text('physical_drop_off_ta', `${t.dashboard.dropOffTitle} (தமிழ்)`)}</div>
            <Button type="submit" className="self-start" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{t.common.save}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader><CardTitle>{t.admin.itemsTitle}</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {items.data?.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 py-3">
                <p className="font-medium">{i.name_en} <span className="font-tamil text-sm text-muted-foreground">/ {i.name_ta}</span></p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    {t.admin.price}
                    <Input type="number" min={0} step="1" defaultValue={Number(i.unit_price_lkr)} className="h-8 w-28"
                      onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== Number(i.unit_price_lkr)) void updateItem(i, { unit_price_lkr: v }) }} />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-primary" checked={i.is_membership_qualifier} onChange={(e) => updateItem(i, { is_membership_qualifier: e.target.checked })} />
                    {t.admin.qualifier}
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-primary" checked={i.active} onChange={(e) => updateItem(i, { active: e.target.checked })} />
                    {t.admin.active}
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
