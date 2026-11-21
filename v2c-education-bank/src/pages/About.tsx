import { Eye, HandHeart, Mail, MessageCircle, Package, Repeat, UserRound } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useSettings } from '@/hooks/useCatalog'
import { TAGLINE_TA } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/LanguageProvider'

export default function About() {
  const { t } = useI18n()
  const { data: settings } = useSettings()
  const valueIcons = [Package, Eye, HandHeart, Repeat]
  const wa = settings?.contact_whatsapp ?? '+94 77 000 0000'
  const email = settings?.contact_email ?? 'hello@v2cclub.org'

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="font-tamil text-sm font-semibold text-sun">{TAGLINE_TA}</p>
      <h1 className="mt-2 text-4xl font-bold">{t.about.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t.about.lead}</p>

      <div className="mt-12 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="text-2xl font-bold">{t.about.storyTitle}</h2>
          <div className="mt-4 space-y-4 text-foreground/90">
            {t.about.story.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
        </section>
        <aside>
          <Card className="border-primary/25 bg-primary-soft p-6">
            <h2 className="text-xl font-bold text-primary">{t.about.visionTitle}</h2>
            <p className="mt-3">{t.about.vision}</p>
          </Card>
        </aside>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">{t.about.valuesTitle}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {t.about.values.map((v, i) => {
            const Icon = valueIcons[i]
            return (
              <Card key={v.title} className="flex gap-4 p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-semibold">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">{t.about.teamTitle}</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.about.team.map((m) => (
            <li key={m.name}>
              <Card className="h-full p-5 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold">
                  <UserRound className="size-7" aria-hidden />
                </div>
                <h3 className="mt-3 font-semibold">{m.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.role}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-lg bg-primary p-8 text-white">
        <h2 className="text-2xl font-bold">{t.about.contactTitle}</h2>
        <p className="mt-2 max-w-xl text-white/85">{t.about.contactBody}</p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <a className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 hover:bg-white/20" href={`https://wa.me/${wa.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" aria-hidden /> {wa}
          </a>
          <a className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 hover:bg-white/20" href={`mailto:${email}`}>
            <Mail className="size-4" aria-hidden /> {email}
          </a>
        </div>
      </section>
    </div>
  )
}
