import { AlertCircle, Award, Bell, BookOpen, CheckCheck, Package } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { isProfileIncomplete } from '@/lib/profileForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { EmptyState, Spinner } from '@/components/ui/states'
import { unwrap, useQuery } from '@/hooks/useQuery'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { ItemBalance, Membership, Notification } from '@/lib/types'
import { cn, formatDate, formatNumber, itemName } from '@/lib/utils'

export function Overview({
  balances, membership, onDeposit, onProfile,
}: {
  balances: { data?: ItemBalance[]; loading: boolean }
  membership: Membership | null
  onDeposit: () => void
  onProfile: () => void
}) {
  const { t, lang } = useI18n()
  const { user, profile } = useAuth()
  const notes = useQuery(async () =>
    unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8)) as Notification[], [user?.id])

  const rows = (balances.data ?? []).filter((b) => b.approved_quantity + b.pending_quantity + b.distributed_quantity > 0)
  const have = membership?.qualifying_quantity ?? 0
  const need = membership?.membership_threshold ?? 6
  const unread = (notes.data ?? []).filter((n) => !n.read_at)

  async function markRead() {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
    void notes.reload()
  }

  return (
    <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-5">
        {isProfileIncomplete(profile) && (
          <Card className="flex flex-col gap-3 border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center">
            <AlertCircle className="size-5 shrink-0 text-amber-700" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold">{t.auth.completeProfileTitle}</p>
              <p className="text-sm text-muted-foreground">{t.auth.completeProfileBody}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onProfile}>{t.dashboard.tabProfile}</Button>
          </Card>
        )}

        {/* Membership */}
        {membership?.is_member ? (
          <Card className="flex items-center gap-4 border-gold/40 bg-gradient-to-r from-gold-soft to-surface p-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold text-white shadow-md">
              <Award className="size-7" aria-hidden />
            </div>
            <div>
              <Badge variant="gold"><Award aria-hidden />{t.dashboard.memberActive}</Badge>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.dashboard.memberActiveBody}</p>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{t.dashboard.memberProgress(Math.min(have, need), need)}</p>
              <Award className="size-5 text-gold" aria-hidden />
            </div>
            <Progress value={(have / need) * 100} className="mt-3" indicatorClassName="bg-gold" label={t.dashboard.memberProgress(have, need)} />
            <p className="mt-2 text-xs text-muted-foreground">{t.dashboard.memberProgressBody}</p>
          </Card>
        )}

        {/* Balances */}
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>{t.dashboard.balancesTitle}</CardTitle>
            <Button size="sm" onClick={onDeposit}><BookOpen aria-hidden />{t.dashboard.tabDeposit}</Button>
          </CardHeader>
          <CardContent>
            {balances.loading && !balances.data ? (
              <Spinner label={t.common.loading} />
            ) : rows.length === 0 ? (
              <EmptyState icon={Package} title={t.dashboard.noBalances} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {rows.map((b) => (
                  <li key={b.item_type_id} className="rounded-md border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{itemName(b, lang)}</p>
                      {b.is_membership_qualifier && <Award className="size-4 text-gold" aria-label={t.admin.qualifier} />}
                    </div>
                    <p className="mt-2 font-display text-3xl font-bold tabular-nums text-primary">
                      {formatNumber(b.available_quantity, lang)}
                      <span className="ml-1.5 font-sans text-sm font-medium text-muted-foreground">{t.dashboard.available}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(b.distributed_quantity, lang)} {t.dashboard.distributed}
                      {b.pending_quantity > 0 && <> · <span className="text-amber-700">{formatNumber(b.pending_quantity, lang)} {t.dashboard.pending}</span></>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card className="h-fit">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Bell className="size-4" aria-hidden />{t.dashboard.notificationsTitle}</CardTitle>
          {unread.length > 0 && <Button variant="ghost" size="sm" onClick={markRead}><CheckCheck aria-hidden />{t.dashboard.markRead}</Button>}
        </CardHeader>
        <CardContent>
          {(notes.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{notes.loading ? t.common.loading : t.dashboard.notificationsEmpty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {notes.data!.map((n) => (
                <li key={n.id} className="py-3">
                  <p className={cn('text-sm', !n.read_at && 'font-semibold')}>
                    {!n.read_at && <span className="mr-1.5 inline-block size-2 rounded-full bg-primary align-middle" aria-hidden />}
                    {lang === 'ta' ? n.title_ta : n.title_en}
                  </p>
                  <p className="text-xs text-muted-foreground">{lang === 'ta' ? n.body_ta : n.body_en}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(n.created_at, lang)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
