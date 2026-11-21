import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '@/i18n/LanguageProvider'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadAccount = useCallback(
    async (userId: string | undefined) => {
      if (!userId) {
        setProfile(null)
        setIsAdmin(false)
        return
      }
      // Role comes from the user_roles table (RLS: own rows only) — never from JWT metadata.
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ])
      setProfile((p as Profile | null) ?? null)
      setIsAdmin(Boolean(roles?.some((r) => r.role === 'admin')))
    },
    [],
  )

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadAccount(data.session?.user.id)
      if (active) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // defer to avoid calling Supabase inside the auth callback lock
        setTimeout(() => void loadAccount(next?.user.id), 0)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadAccount])

  // Adopt the donor's saved language preference once on sign-in
  useEffect(() => {
    if (profile?.preferred_language) setLang(profile.preferred_language)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      loading,
      refreshProfile: () => loadAccount(session?.user.id),
      signOut: async () => {
        await supabase.auth.signOut()
        setProfile(null)
        setIsAdmin(false)
      },
    }),
    [session, profile, isAdmin, loading, loadAccount],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
