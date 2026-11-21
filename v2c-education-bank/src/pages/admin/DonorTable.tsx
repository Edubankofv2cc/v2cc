import { Award, Download, MessageCircle, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState, Spinner } from '@/components/ui/states'
import { unwrap, useQuery } from '@/hooks/useQuery'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { ItemBalance, Membership, Profile } from '@/lib/types'
import { downloadText, formatDate, toCsv } from '@/lib/utils'

export function DonorTable({ version }: { version: number }) {
  const { t, lang } = useI18n()
  const [q, setQ] = useState('')
  const data = useQuery(async () => {
    const [p, b, m] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('donor_item_balances').select('*'),
      supabase.from('donor_membership').select('*'),
    ])
    return { profiles: unwrap(p) as Profile[], balances: unwrap(b) as ItemBalance[], membership: unwrap(m) as Membership[] }
  }, [version])

  const rows = useMemo(() => {
    if (!data.data) return []
    const mem = new Map(data.data.membership.map((m) => [m.donor_id, m]))
    const bal = new Map<string, ItemBalance[]>()
    for (const b of data.data.balances) bal.set(b.donor_id, [...(bal.get(b.donor_id) ?? []), b])
    return data.data.profiles.map((p) => ({ p, m: mem.get(p.id), b: bal.get(p.id) ?? [] }))
  }, [data.data])

  const filtered = rows.filter(({ p }) => {
    const s = q.trim().toLowerCase()
    return !s || [p.full_name, p.email, p.district, p.whatsapp_number, p.school_attended].some((v) => v?.toLowerCase().includes(s))
  })

  function exportCsv() {
    const items = (data.data?.balances ?? []).reduce<{ slug: string; name: string }[]>((acc, b) => {
      if (!acc.some((x) => x.slug === b.slug)) acc.push({ slug: b.slug, name: b.name_en })
      return acc
    }, [])
    const headers = [
      'Full name', 'Email', 'WhatsApp', 'School attended', 'District', 'Address', 'Occupation', 'Referral source',
      'Membership categories', 'Account opening reason', 'Preferred language', 'Joined', 'Member', 'Qualifying books',
      ...items.flatMap((i) => [`${i.name} available`, `${i.name} distributed`]),
    ]
    const body = filtered.map(({ p, m, b }) => [
      p.full_name, p.email, p.whatsapp_number, p.school_attended, p.district, p.full_address, p.occupation, p.referral_source,
      p.membership_categories.map((c) => t.categories[c as keyof typeof t.categories] ?? c), p.account_opening_reason,
      p.preferred_language, p.created_at.slice(0, 10), m?.is_member ? 'Yes' : 'No', m?.qualifying_quantity ?? 0,
      ...items.flatMap((i) => {
        const x = b.find((y) => y.slug === i.slug)
        return [x?.available_quantity ?? 0, x?.distributed_quantity ?? 0]
      }),
    ])
    downloadText(`v2c-donors-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, body))
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>{t.admin.donorsTitle} {data.data && <span className="text-muted-foreground">({filtered.length})</span>}</CardTitle>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input className="pl-9" placeholder={t.common.search} aria-label={t.common.search} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download aria-hidden />{t.admin.exportCsv}</Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.loading && !data.data ? <Spinner label={t.common.loading} /> : !filtered.length ? (
          <EmptyState icon={Users} title="—" />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 font-medium">{t.auth.fullName}</th>
                  <th className="px-3 py-2 font-medium">{t.auth.whatsapp}</th>
                  <th className="px-3 py-2 font-medium">{t.common.district}</th>
                  <th className="px-3 py-2 font-medium">{t.auth.categories}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.balance}</th>
                  <th className="px-3 py-2 font-medium">{t.common.status}</th>
                  <th className="px-5 py-2 font-medium">{t.admin.joined}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(({ p, m, b }) => {
                  const held = b.filter((x) => x.available_quantity > 0)
                  return (
                    <tr key={p.id} className="align-top hover:bg-muted/50">
                      <td className="px-5 py-3"><p className="font-medium">{p.full_name || '—'}</p><p className="text-xs text-muted-foreground">{p.email}</p></td>
                      <td className="px-3 py-3">
                        {p.whatsapp_number ? (
                          <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`https://wa.me/${p.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                            <MessageCircle className="size-3.5" aria-hidden />{p.whatsapp_number}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3">{p.district ?? '—'}</td>
                      <td className="max-w-[200px] px-3 py-3 text-xs">{p.membership_categories.map((c) => t.categories[c as keyof typeof t.categories] ?? c).join(', ') || '—'}</td>
                      <td className="px-3 py-3 text-xs">{held.length ? held.map((x) => `${x.available_quantity} ${lang === 'ta' ? x.name_ta : x.name_en}`).join(', ') : '—'}</td>
                      <td className="px-3 py-3">{m?.is_member ? <Badge variant="gold"><Award aria-hidden />{t.admin.member}</Badge> : <Badge variant="muted">{t.admin.donorOnly} · {m?.qualifying_quantity ?? 0}/{m?.membership_threshold ?? 6}</Badge>}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(p.created_at, lang)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
