import { ArrowRight, Award, BookOpen, Check, GraduationCap, HandCoins, Package, School, ShieldCheck, Truck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { ProofImage } from '@/components/ProofImage'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { useSettings } from '@/hooks/useCatalog'
import { unwrap, useQuery } from '@/hooks/useQuery'
import { TAGLINE_TA } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { FeedEvent, PublicStats, RecentDistribution } from '@/lib/types'
import { formatDate, formatNumber, itemName } from '@/lib/utils'

export default function Home() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const settings = useSettings()
  const threshold = settings.data?.membership_threshold ?? 6

  const stats = useQuery(async () => unwrap(await supabase.rpc('public_stats')) as PublicStats)
  const feed = useQuery(async () => unwrap(await supabase.rpc('public_feed', { _limit: 16 })) as FeedEvent[])
  const recent = useQuery(
    async () => unwrap(await supabase.rpc('recent_distributions', { _limit: 6 })) as RecentDistribution[],
    [user?.id],
  )

  const statCards = [
    { icon: BookOpen, label: t.home.statItems, value: stats.data?.items_donated },
    { icon: Truck, label: t.home.statDistributed, value: stats.data?.items_distributed },
    { icon: GraduationCap, label: t.home.statStudents, value: stats.data?.students_supported },
    { icon: Award, label: t.home.statMembers, value: stats.data?.active_members },
  ]

  const feedLine = (e: FeedEvent) => {
    const item = `${formatNumber(e.quantity, lang)} × ${itemName({ name_en: e.item_name_en, name_ta: e.item_name_ta }, lang)}`
    if (e.event_type === 'distribution') return `${item} ${t.home.tickerDistribution} ${e.school_name}, ${e.village_name}`
    return e.district ? `${item} ${t.home.tickerDeposit} ${e.district}` : `${item} ${t.home.tickerDepositNoDistrict}`
  }

  const howIcons = [Package, HandCoins, ShieldCheck, School]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-gold-soft blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.25fr_1fr] md:py-20">
          <div>
            <p className="font-tamil text-sm font-semibold text-sun">{TAGLINE_TA}</p>
            <p className="mt-3 text-xs font-semibold text-primary">{t.home.eyebrow}</p>
            <h1 className="mt-2 text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl">{t.home.title}</h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">{t.home.lead}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={user ? '/dashboard' : '/auth?mode=register'}>
                  {user ? t.nav.dashboard : t.home.ctaOpen}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">{t.home.ctaHow}</a>
              </Button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <img src="/v2c-logo.jpg" alt="Village 2 City Club emblem: children climbing a ladder to the world, beneath a rising sun" className="aspect-square w-full rounded-full border-8 border-surface object-cover shadow-xl" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-labelledby="stats-title" className="mx-auto max-w-6xl px-4 py-10">
        <h2 id="stats-title" className="sr-only">{t.home.statsTitle}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <p className="mt-3 font-display text-3xl font-bold tabular-nums">
                {value === undefined ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" /> : formatNumber(value, lang)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Transparency ticker */}
      <section aria-label="Live transparency feed" className="border-y border-border bg-primary-soft">
        {feed.data && feed.data.length > 0 ? (
          <div className="flex overflow-hidden py-3" aria-live="off">
            <ul className="flex shrink-0 animate-ticker gap-10 pr-10 text-sm hover:[animation-play-state:paused]">
              {[...feed.data, ...feed.data].map((e, i) => (
                <li key={i} aria-hidden={i >= feed.data!.length} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                  {e.event_type === 'distribution' ? <School className="size-4 text-primary" aria-hidden /> : <BookOpen className="size-4 text-gold" aria-hidden />}
                  <span>{feedLine(e)}</span>
                  <span className="text-muted-foreground">· {formatDate(e.happened_at, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="px-4 py-3 text-center text-sm text-muted-foreground">{t.home.tickerEmpty}</p>
        )}
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold">{t.home.howTitle}</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.how.map((step, i) => {
            const Icon = howIcons[i]
            return (
              <li key={step.title}>
                <Card className="h-full p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
                    <Icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </Card>
              </li>
            )
          })}
        </ol>
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-surface p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm"><strong>{t.home.ruleTitle}:</strong> {t.home.ruleBody}</p>
        </div>
      </section>

      {/* Membership */}
      <section className="bg-gold-soft/60">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-white">
              <Award className="size-4" aria-hidden /> {t.status.member}
            </span>
            <h2 className="mt-4 text-3xl font-bold">{t.home.memberTitle}</h2>
            <p className="mt-3 text-muted-foreground">{t.home.memberBody(threshold)}</p>
          </div>
          <Card className="p-6">
            <div className="flex items-center gap-2" aria-hidden>
              {Array.from({ length: threshold }).map((_, i) => (
                <BookOpen key={i} className="size-7 text-primary" />
              ))}
              <ArrowRight className="size-5 text-muted-foreground" />
              <Award className="size-8 text-gold" />
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {t.home.memberPoints.map((p) => (
                <li key={p} className="flex items-start gap-2"><Check className="mt-0.5 size-4 text-primary" aria-hidden />{p}</li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* Recent distributions */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold">{t.home.proofsTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.home.proofsLead}</p>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-4" aria-hidden />{t.footer.privacy}</p>
        </div>
        {recent.data && recent.data.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.data.map((d) => (
              <Card key={d.id} className="overflow-hidden">
                <ProofImage path={d.photo_proof_url} locked={!user} alt={`${d.school_name}, ${d.village_name}`} />
                <div className="p-4">
                  <p className="font-semibold">{formatNumber(d.quantity, lang)} × {itemName({ name_en: d.item_name_en, name_ta: d.item_name_ta }, lang)}</p>
                  <p className="text-sm text-muted-foreground">{d.school_name} · {d.village_name}{d.district ? `, ${d.district}` : ''}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(d.distributed_at, lang)}{d.student_grade ? ` · ${t.common.grade} ${d.student_grade}` : ''}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={School} title={recent.loading ? t.common.loading : t.home.proofsEmpty} className="mt-8" />
        )}
      </section>

      {/* CTA */}
      {!user && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-lg bg-primary px-6 py-10 text-center text-white sm:px-12">
            <h2 className="text-3xl font-bold">{t.home.finalTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">{t.home.finalBody}</p>
            <Button asChild size="lg" variant="gold" className="mt-6">
              <Link to="/auth?mode=register">{t.home.ctaOpen}<ArrowRight aria-hidden /></Link>
            </Button>
          </div>
        </section>
      )}
    </>
  )
}
