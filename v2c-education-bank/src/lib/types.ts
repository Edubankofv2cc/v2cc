export type Lang = 'en' | 'ta'
export type Role = 'admin' | 'donor'
export type DepositStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'bank_transfer' | 'physical_delivery'

export interface Profile {
  id: string
  full_name: string
  email: string
  whatsapp_number: string | null
  school_attended: string | null
  district: string | null
  full_address: string | null
  occupation: string | null
  referral_source: string | null
  membership_categories: string[]
  account_opening_reason: string | null
  preferred_language: Lang
  created_at: string
}

export interface ItemType {
  id: string
  slug: string
  name_en: string
  name_ta: string
  unit_price_lkr: number
  is_membership_qualifier: boolean
  active: boolean
  sort_order: number
}

export interface AppSettings {
  membership_threshold: number
  bank_name: string
  bank_branch: string
  account_name: string
  account_number: string
  swift_code: string | null
  physical_drop_off_en: string
  physical_drop_off_ta: string
  contact_whatsapp: string
  contact_email: string
}

export interface Deposit {
  id: string
  donor_id: string
  item_type_id: string
  quantity: number
  total_amount_lkr: number
  payment_method: PaymentMethod
  reference_code: string
  bank_reference: string | null
  receipt_image_url: string | null
  status: DepositStatus
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  item_types?: Pick<ItemType, 'name_en' | 'name_ta' | 'slug'> | null
  profiles?: Pick<Profile, 'full_name' | 'email' | 'whatsapp_number' | 'district'> | null
}

export interface Distribution {
  id: string
  donor_id: string
  item_type_id: string
  quantity: number
  students_reached: number
  school_name: string
  village_name: string
  district: string | null
  student_grade: string | null
  photo_proof_url: string | null
  distributed_at: string
  created_at: string
  item_types?: Pick<ItemType, 'name_en' | 'name_ta' | 'slug'> | null
  profiles?: Pick<Profile, 'full_name'> | null
}

export interface ItemBalance {
  donor_id: string
  item_type_id: string
  slug: string
  name_en: string
  name_ta: string
  is_membership_qualifier: boolean
  approved_quantity: number
  pending_quantity: number
  distributed_quantity: number
  available_quantity: number
}

export interface Membership {
  donor_id: string
  qualifying_quantity: number
  membership_threshold: number
  is_member: boolean
}

export interface Notification {
  id: string
  kind: string
  title_en: string
  title_ta: string
  body_en: string
  body_ta: string
  read_at: string | null
  created_at: string
}

export interface PublicStats {
  items_donated: number
  items_distributed: number
  students_supported: number
  schools_reached: number
  active_members: number
  donors: number
}

export interface FeedEvent {
  event_type: 'deposit' | 'distribution'
  quantity: number
  item_name_en: string
  item_name_ta: string
  school_name: string | null
  village_name: string | null
  district: string | null
  happened_at: string
}

export interface RecentDistribution {
  id: string
  quantity: number
  item_name_en: string
  item_name_ta: string
  school_name: string
  village_name: string
  district: string | null
  student_grade: string | null
  distributed_at: string
  photo_proof_url: string | null
}

export interface AdminStats {
  items_banked: number
  items_distributed: number
  items_pending: number
  deposits_pending: number
  value_banked_lkr: number
  donors: number
  members: number
  students_reached: number
}
