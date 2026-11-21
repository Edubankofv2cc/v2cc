import { Camera, Loader2, Truck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ProofImage } from '@/components/ProofImage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/states'
import { unwrap, useQuery } from '@/hooks/useQuery'
import { DISTRICTS } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase, uploadPrivateFile } from '@/lib/supabase'
import type { Distribution, ItemBalance } from '@/lib/types'
import { formatDate, formatNumber, itemName } from '@/lib/utils'

const today = () => new Date().toISOString().slice(0, 10)

export function DistributionForm({ version, onSaved }: { version: number; onSaved: () => void }) {
  const { t, lang } = useI18n()
  const [donorId, setDonorId] = useState('')
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState(1)
  const [students, setStudents] = useState(1)
  const [school, setSchool] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [grade, setGrade] = useState('')
  const [date, setDate] = useState(today)
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  // Only donors with something available can be selected
  const balances = useQuery(async () =>
    unwrap(await supabase.from('donor_item_balances').select('*').gt('available_quantity', 0)) as ItemBalance[], [version])
  const donors = useQuery(async () =>
    unwrap(await supabase.from('profiles').select('id, full_name, email, district').order('full_name')) as { id: string; full_name: string; email: string; district: string | null }[], [])
  const recent = useQuery(async () =>
    unwrap(await supabase.from('distributions').select('*, item_types(name_en, name_ta, slug), profiles(full_name)').order('created_at', { ascending: false }).limit(9)) as Distribution[], [version])

  const donorsWithBalance = useMemo(() => {
    const ids = new Set((balances.data ?? []).map((b) => b.donor_id))
    return (donors.data ?? []).filter((d) => ids.has(d.id))
  }, [balances.data, donors.data])
  const donorItems = (balances.data ?? []).filter((b) => b.donor_id === donorId)
  const selected = donorItems.find((b) => b.item_type_id === itemId)
  const max = selected?.available_quantity ?? 0

  function reset() {
    setItemId(''); setQty(1); setStudents(1); setGrade(''); setPhoto(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!selected || qty < 1 || qty > max) return
    setBusy(true)
    const id = crypto.randomUUID()
    let photoPath: string | null = null
    try {
      if (photo) photoPath = await uploadPrivateFile('proofs', id, photo)
      const { error } = await supabase.from('distributions').insert({
        id, donor_id: donorId, item_type_id: itemId, quantity: qty, students_reached: students,
        school_name: school.trim(), village_name: village.trim(), district: district || null,
        student_grade: grade.trim() || null, distributed_at: date, photo_proof_url: photoPath,
      })
      if (error) throw error
      toast.success(t.admin.distSaved)
      reset(); onSaved()
    } catch (err) {
      if (photoPath) await supabase.storage.from('proofs').remove([photoPath])
      toast.error(err instanceof Error ? err.message : t.common.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t.admin.distTitle}</CardTitle>
          <CardDescription>{t.admin.distLead}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label={t.common.donor} htmlFor="d-donor" required className="sm:col-span-2">
              <NativeSelect id="d-donor" required value={donorId} onChange={(e) => { setDonorId(e.target.value); setItemId('') }}>
                <option value="">{t.admin.selectDonor}</option>
                {donorsWithBalance.map((d) => <option key={d.id} value={d.id}>{d.full_name || d.email}{d.district ? ` — ${d.district}` : ''}</option>)}
              </NativeSelect>
            </Field>
            {donorId && donorItems.length === 0 && <p className="text-sm text-muted-foreground sm:col-span-2">{t.admin.noBalance}</p>}
            <Field label={t.common.item} htmlFor="d-item" required>
              <NativeSelect id="d-item" required value={itemId} disabled={!donorId} onChange={(e) => { setItemId(e.target.value); setQty(1) }}>
                <option value="">{t.admin.selectItem}</option>
                {donorItems.map((b) => <option key={b.item_type_id} value={b.item_type_id}>{itemName(b, lang)} ({t.admin.availableBalance(b.available_quantity)})</option>)}
              </NativeSelect>
            </Field>
            <Field label={t.common.quantity} htmlFor="d-qty" required hint={selected ? t.admin.availableBalance(max) : undefined}>
              <Input id="d-qty" type="number" min={1} max={max || 1} required disabled={!selected} value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(max || 1, Math.floor(Number(e.target.value) || 1))))} />
            </Field>
            <Field label={t.common.school} htmlFor="d-school" required>
              <Input id="d-school" required maxLength={200} value={school} onChange={(e) => setSchool(e.target.value)} />
            </Field>
            <Field label={t.common.village} htmlFor="d-village" required>
              <Input id="d-village" required maxLength={200} value={village} onChange={(e) => setVillage(e.target.value)} />
            </Field>
            <Field label={t.common.district} htmlFor="d-district">
              <NativeSelect id="d-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="">{t.auth.selectDistrict}</option>
                {DISTRICTS.map((d) => <option key={d.en} value={d.en}>{lang === 'ta' ? d.ta : d.en}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t.common.grade} htmlFor="d-grade" hint={t.common.optional}>
              <Input id="d-grade" maxLength={40} placeholder="6–9" value={grade} onChange={(e) => setGrade(e.target.value)} />
            </Field>
            <Field label={t.admin.students} htmlFor="d-students" required>
              <Input id="d-students" type="number" min={1} required value={students} onChange={(e) => setStudents(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
            </Field>
            <Field label={t.common.date} htmlFor="d-date" required>
              <Input id="d-date" type="date" required max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t.admin.photoProof} htmlFor="d-photo" hint={t.admin.photoHint} className="sm:col-span-2">
              <label htmlFor="d-photo" className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm hover:bg-muted">
                <Camera className="size-5 text-primary" aria-hidden />
                <span className="truncate">{photo ? photo.name : t.admin.photoProof}</span>
              </label>
              <input id="d-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </Field>
            <Button type="submit" size="lg" className="sm:col-span-2" disabled={busy || !selected || qty > max}>
              {busy ? <Loader2 className="animate-spin" /> : <Truck aria-hidden />}{t.admin.tabDistribute}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader><CardTitle>{t.admin.recentDistributions}</CardTitle></CardHeader>
        <CardContent>
          {!recent.data?.length ? (
            <EmptyState icon={Truck} title={recent.loading ? t.common.loading : t.home.proofsEmpty} />
          ) : (
            <ul className="flex flex-col gap-3">
              {recent.data.map((d) => (
                <li key={d.id} className="flex gap-3">
                  <ProofImage path={d.photo_proof_url} alt={d.school_name} className="w-20 shrink-0 rounded-md" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{formatNumber(d.quantity, lang)} × {itemName(d.item_types, lang)}</p>
                    <p className="truncate text-muted-foreground">{d.school_name}, {d.village_name}</p>
                    <p className="text-xs text-muted-foreground">{d.profiles?.full_name} · {formatDate(d.distributed_at, lang)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
