import { BookOpen, History, Images, LayoutDashboard, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { unwrap, useQuery } from '@/hooks/useQuery'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { Deposit, Distribution, ItemBalance, Membership } from '@/lib/types'
import { DepositForm } from './DepositForm'
import { DepositHistory } from './DepositHistory'
import { ImpactTab } from './ImpactTab'
import { Overview } from './Overview'
import { ProfileTab } from './ProfileTab'

export default function Dashboard() {
  const { t } = useI18n()
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('overview')
  const uid = user!.id

  const balances = useQuery(async () =>
    unwrap(await supabase.from('donor_item_balances').select('*').eq('donor_id', uid)) as ItemBalance[], [uid])
  const membership = useQuery(async () =>
    unwrap(await supabase.from('donor_membership').select('*').eq('donor_id', uid).maybeSingle()) as Membership | null, [uid])
  const deposits = useQuery(async () =>
    unwrap(await supabase.from('deposits').select('*, item_types(name_en, name_ta, slug)').eq('donor_id', uid).order('created_at', { ascending: false })) as Deposit[], [uid])
  const distributions = useQuery(async () =>
    unwrap(await supabase.from('distributions').select('*, item_types(name_en, name_ta, slug)').eq('donor_id', uid).order('distributed_at', { ascending: false })) as Distribution[], [uid])

  const refreshAll = () => { void balances.reload(); void membership.reload(); void deposits.reload() }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t.dashboard.hello(profile?.full_name?.split(' ')[0] ?? '')}</h1>
      <p className="mt-1 text-muted-foreground">{t.dashboard.lead}</p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="overview"><LayoutDashboard aria-hidden />{t.dashboard.tabOverview}</TabsTrigger>
          <TabsTrigger value="deposit"><BookOpen aria-hidden />{t.dashboard.tabDeposit}</TabsTrigger>
          <TabsTrigger value="history"><History aria-hidden />{t.dashboard.tabHistory}</TabsTrigger>
          <TabsTrigger value="impact"><Images aria-hidden />{t.dashboard.tabImpact}</TabsTrigger>
          <TabsTrigger value="profile"><UserRound aria-hidden />{t.dashboard.tabProfile}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview balances={balances} membership={membership.data ?? null} onDeposit={() => setTab('deposit')} onProfile={() => setTab('profile')} />
        </TabsContent>
        <TabsContent value="deposit">
          <DepositForm onSubmitted={() => { refreshAll(); setTab('history') }} />
        </TabsContent>
        <TabsContent value="history">
          <DepositHistory deposits={deposits} onChanged={refreshAll} />
        </TabsContent>
        <TabsContent value="impact">
          <ImpactTab distributions={distributions} />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
