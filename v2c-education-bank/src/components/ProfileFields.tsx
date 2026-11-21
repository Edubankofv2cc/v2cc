import { Checkbox } from '@/components/ui/checkbox'
import { Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { DISTRICTS, MEMBERSHIP_CATEGORIES } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/LanguageProvider'
import type { ProfileForm } from '@/lib/profileForm'
import type { Lang } from '@/lib/types'

export function ProfileFields({ value, onChange }: { value: ProfileForm; onChange: (next: ProfileForm) => void }) {
  const { t, lang } = useI18n()
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => onChange({ ...value, [k]: v })
  const toggleCat = (c: string, on: boolean) =>
    set('membership_categories', on ? [...value.membership_categories, c] : value.membership_categories.filter((x) => x !== c))

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.auth.fullName} htmlFor="full_name" required>
        <Input id="full_name" required maxLength={120} autoComplete="name" value={value.full_name} onChange={(e) => set('full_name', e.target.value)} />
      </Field>
      <Field label={t.auth.whatsapp} htmlFor="whatsapp" required>
        <Input id="whatsapp" required type="tel" inputMode="tel" maxLength={32} pattern="[+0-9 ()-]{7,32}" autoComplete="tel" placeholder="+94 77 123 4567" value={value.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} />
      </Field>
      <Field label={t.auth.school} htmlFor="school">
        <Input id="school" maxLength={160} value={value.school_attended} onChange={(e) => set('school_attended', e.target.value)} />
      </Field>
      <Field label={t.auth.district} htmlFor="district" required>
        <NativeSelect id="district" required value={value.district} onChange={(e) => set('district', e.target.value)}>
          <option value="">{t.auth.selectDistrict}</option>
          {DISTRICTS.map((d) => <option key={d.en} value={d.en}>{lang === 'ta' ? `${d.ta} (${d.en})` : d.en}</option>)}
        </NativeSelect>
      </Field>
      <Field label={t.auth.address} htmlFor="address" className="sm:col-span-2">
        <Textarea id="address" rows={2} maxLength={400} autoComplete="street-address" className="min-h-16" value={value.full_address} onChange={(e) => set('full_address', e.target.value)} />
      </Field>
      <Field label={t.auth.occupation} htmlFor="occupation">
        <Input id="occupation" maxLength={120} autoComplete="organization-title" value={value.occupation} onChange={(e) => set('occupation', e.target.value)} />
      </Field>
      <Field label={t.auth.referral} htmlFor="referral">
        <Input id="referral" maxLength={160} value={value.referral_source} onChange={(e) => set('referral_source', e.target.value)} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">{t.auth.categories}</legend>
        <p className="mb-2 text-xs text-muted-foreground">{t.auth.categoriesHint}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MEMBERSHIP_CATEGORIES.map((c) => (
            <div key={c} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Checkbox id={`cat-${c}`} checked={value.membership_categories.includes(c)} onCheckedChange={(on) => toggleCat(c, on === true)} />
              <Label htmlFor={`cat-${c}`} className="cursor-pointer font-normal">{t.categories[c]}</Label>
            </div>
          ))}
        </div>
      </fieldset>
      <Field label={t.auth.reason} htmlFor="reason" className="sm:col-span-2">
        <Textarea id="reason" maxLength={1000} value={value.account_opening_reason} onChange={(e) => set('account_opening_reason', e.target.value)} />
      </Field>
      <Field label={t.auth.preferredLanguage} htmlFor="pref_lang">
        <NativeSelect id="pref_lang" value={value.preferred_language} onChange={(e) => set('preferred_language', e.target.value as Lang)}>
          <option value="en">English</option>
          <option value="ta">தமிழ்</option>
        </NativeSelect>
      </Field>
    </div>
  )
}
