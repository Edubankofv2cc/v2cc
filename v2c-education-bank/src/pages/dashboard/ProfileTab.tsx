import { Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { ProfileFields } from '@/components/ProfileFields'
import { emptyProfileForm, type ProfileForm } from '@/lib/profileForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'

export function ProfileTab() {
  const { t, lang, setLang } = useI18n()
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState<ProfileForm>(() => emptyProfileForm(lang))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? '', whatsapp_number: profile.whatsapp_number ?? '', school_attended: profile.school_attended ?? '',
      district: profile.district ?? '', full_address: profile.full_address ?? '', occupation: profile.occupation ?? '',
      referral_source: profile.referral_source ?? '', membership_categories: profile.membership_categories ?? [],
      account_opening_reason: profile.account_opening_reason ?? '', preferred_language: profile.preferred_language ?? lang,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]))
    payload.full_name = form.full_name.trim()
    const { error } = await supabase.from('profiles').update(payload).eq('id', user!.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    setLang(form.preferred_language)
    toast.success(t.dashboard.profileSaved)
    void refreshProfile()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.dashboard.profileTitle}</CardTitle>
        <CardDescription>{profile?.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-5">
          <ProfileFields value={form} onChange={setForm} />
          <Button type="submit" className="self-start" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{t.common.save}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
