import { supabase } from '@/lib/supabase'
import type { AppSettings, ItemType } from '@/lib/types'
import { unwrap, useQuery } from './useQuery'

export function useItemTypes(includeInactive = false) {
  return useQuery(async () => {
    let q = supabase.from('item_types').select('*').order('sort_order')
    if (!includeInactive) q = q.eq('active', true)
    return unwrap(await q) as ItemType[]
  }, [includeInactive])
}

export function useSettings() {
  return useQuery(async () => unwrap(await supabase.from('app_settings').select('*').maybeSingle()) as AppSettings | null)
}
