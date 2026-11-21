import type { Lang } from './types'

export interface ProfileForm {
  full_name: string
  whatsapp_number: string
  school_attended: string
  district: string
  full_address: string
  occupation: string
  referral_source: string
  membership_categories: string[]
  account_opening_reason: string
  preferred_language: Lang
}

export const emptyProfileForm = (lang: Lang): ProfileForm => ({
  full_name: '', whatsapp_number: '', school_attended: '', district: '', full_address: '', occupation: '',
  referral_source: '', membership_categories: [], account_opening_reason: '', preferred_language: lang,
})

export function isProfileIncomplete(p: { full_name?: string | null; whatsapp_number?: string | null; district?: string | null } | null) {
  return !p || !p.full_name || !p.whatsapp_number || !p.district
}
