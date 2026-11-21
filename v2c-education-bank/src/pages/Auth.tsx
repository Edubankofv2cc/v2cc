import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { Logo } from '@/components/Logo'
import { ProfileFields } from '@/components/ProfileFields'
import { emptyProfileForm, type ProfileForm } from '@/lib/profileForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TAGLINE_TA } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.3Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2.1A11 11 0 0 0 1 12c0 1.8.4 3.4 1.1 4.9L5.8 14Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1L5.8 10C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  )
}

export default function AuthPage() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [tab, setTab] = useState(params.get('mode') === 'register' ? 'register' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profile, setProfile] = useState<ProfileForm>(() => emptyProfileForm(lang))
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const redirectTo = `${window.location.origin}/dashboard`

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) toast.error(error.message.toLowerCase().includes('invalid') ? t.auth.invalidCredentials : error.message)
  }

  async function register(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return toast.error(t.auth.weakPassword)
    setBusy(true)
    const trimmed = Object.fromEntries(
      Object.entries(profile).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    )
    // Metadata is copied into `profiles` by a DB trigger. Any "role" here is ignored — signups are donors.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo, data: trimmed },
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    if (!data.session) {
      toast.success(t.auth.checkEmail, { duration: 10000 })
      setTab('signin')
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) toast.error(error.message)
  }

  async function forgot() {
    if (!email) return toast.error(`${t.auth.email}: ${t.common.required}`)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) toast.error(error.message)
    else toast.success(t.auth.resetSent)
  }

  const credentials = (autoPw: string) => (
    <>
      <Field label={t.auth.email} htmlFor={`email-${autoPw}`} required>
        <Input id={`email-${autoPw}`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label={t.auth.password} htmlFor={`pw-${autoPw}`} hint={autoPw === 'new-password' ? t.auth.passwordHint : undefined} required>
        <Input id={`pw-${autoPw}`} type="password" required minLength={autoPw === 'new-password' ? 8 : undefined} autoComplete={autoPw} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
    </>
  )

  const googleBlock = (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={google}>
        <GoogleIcon /> {t.auth.google}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />{t.auth.or}<span className="h-px flex-1 bg-border" />
      </div>
    </>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo className="size-16" />
        <p className="mt-2 font-tamil text-sm text-sun">{TAGLINE_TA}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mx-auto max-w-sm">
          <TabsTrigger value="signin" className="flex-1 justify-center">{t.auth.tabSignIn}</TabsTrigger>
          <TabsTrigger value="register" className="flex-1 justify-center">{t.auth.tabRegister}</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">{t.auth.signInTitle}</CardTitle>
              <CardDescription>{t.auth.signInLead}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={signIn} className="flex flex-col gap-4">
                {googleBlock}
                {credentials('current-password')}
                <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{t.auth.signInBtn}</Button>
                <Button type="button" variant="link" size="sm" onClick={forgot} className="self-center">{t.auth.forgot}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t.auth.registerTitle}</CardTitle>
              <CardDescription>{t.auth.registerLead}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={register} className="flex flex-col gap-5">
                {googleBlock}
                <div className="grid gap-4 sm:grid-cols-2">{credentials('new-password')}</div>
                <ProfileFields value={profile} onChange={setProfile} />
                <Button type="submit" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{t.auth.registerBtn}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
