import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'public-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

/** Short-lived signed URL for a private storage object. */
export async function signedUrl(bucket: 'receipts' | 'proofs', path: string | null | undefined, seconds = 600) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds)
  if (error) return null
  return data.signedUrl
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function uploadPrivateFile(bucket: 'receipts' | 'proofs', folder: string, file: File) {
  if (!ALLOWED.includes(file.type) || (bucket === 'proofs' && file.type === 'application/pdf')) {
    throw new Error('unsupported_file')
  }
  const limit = bucket === 'receipts' ? 5 : 8
  if (file.size > limit * 1024 * 1024) throw new Error('file_too_large')
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}
