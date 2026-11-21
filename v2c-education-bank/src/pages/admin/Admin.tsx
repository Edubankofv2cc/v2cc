import { BarChart3, ClipboardCheck, Settings, ShieldAlert, Truck, Users } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/states'
import { useI18n } from '@/i18n/LanguageProvider'
import { AdminOverview } from './AdminOverview'
import { DepositReview } from './DepositReview'
import { DistributionForm } from './DistributionForm'
import { DonorTable } from './DonorTable'
import { SettingsPanel } from './SettingsPanel'

export default function Admin() {
  const { t } = useI18n()
  const { isAdmin, loading } = useAuth()
  const [tab, setTab] = useState('overview')
  // Changes in one tab (approve / distribute) bump this so others refetch
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  // UI gate only; every admin action is enforced again by RLS / SECURITY DEFINER checks in Postgres.
  if (!loading && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState icon={ShieldAlert} title={t.admin.denied}><p className="text-xs text-muted-foreground">{t.admin.deniedBody}</p></EmptyState>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t.admin.title}</h1>
      <p className="mt-1 text-muted-foreground">{t.admin.lead}</p>
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="overview"><BarChart3 aria-hidden />{t.admin.tabOverview}</TabsTrigger>
          <TabsTrigger value="deposits"><ClipboardCheck aria-hidden />{t.admin.tabDeposits}</TabsTrigger>
          <TabsTrigger value="distribute"><Truck aria-hidden />{t.admin.tabDistribute}</TabsTrigger>
          <TabsTrigger value="donors"><Users aria-hidden />{t.admin.tabDonors}</TabsTrigger>
          <TabsTrigger value="settings"><Settings aria-hidden />{t.admin.tabSettings}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><AdminOverview version={version} onOpenDeposits={() => setTab('deposits')} /></TabsContent>
        <TabsContent value="deposits"><DepositReview onChanged={bump} /></TabsContent>
        <TabsContent value="distribute"><DistributionForm version={version} onSaved={bump} /></TabsContent>
        <TabsContent value="donors"><DonorTable version={version} /></TabsContent>
        <TabsContent value="settings"><SettingsPanel /></TabsContent>
      </Tabs>
    </div>
  )
}
