import { Award, BookOpen, Clock, GraduationCap, Hourglass, Truck, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { unwrap, useQuery } from '@/hooks/useQuery'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { AdminStats } from '@/lib/types'
import { formatLKR, formatNumber } from '@/lib/utils'

export function AdminOverview({ version, onOpenDeposits }: { version: number; onOpenDeposits: () => void }) {
  const { t, lang } = useI18n()
  const { data: s, error } = useQuery(async () => unwrap(await supabase.rpc('admin_stats')) as AdminStats, [version])
  if (error) return <p className="text-sm text-destructive">{error.message}</p>

  const n = (v?: number) => (v === undefined ? '…' : formatNumber(Number(v), lang))
  const cards = [
    { icon: BookOpen, label: t.admin.statBanked, value: n(s?.items_banked) },
    { icon: Truck, label: t.admin.statDistributed, value: n(s?.items_distributed) },
    { icon: Hourglass, label: t.admin.statPending, value: n(s?.items_pending), warn: (s?.items_pending ?? 0) > 0 },
    { icon: Wallet, label: t.admin.statValue, value: s ? formatLKR(Number(s.value_banked_lkr), lang) : '…' },
    { icon: Users, label: t.admin.statDonors, value: n(s?.donors) },
    { icon: Award, label: t.admin.statMembers, value: n(s?.members) },
    { icon: GraduationCap, label: t.admin.statStudents, value: n(s?.students_reached) },
    { icon: Clock, label: t.admin.statPendingDeposits, value: n(s?.deposits_pending), warn: (s?.deposits_pending ?? 0) > 0 },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, warn }) => (
          <Card key={label} className={warn ? 'border-amber-300 bg-amber-50 p-5' : 'p-5'}>
            <Icon className={warn ? 'size-5 text-amber-700' : 'size-5 text-primary'} aria-hidden />
            <p className="mt-3 font-display text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>
      {(s?.deposits_pending ?? 0) > 0 && (
        <Button onClick={onOpenDeposits} className="self-start">{t.admin.tabDeposits} ({s!.deposits_pending})</Button>
      )}
    </div>
  )
}
