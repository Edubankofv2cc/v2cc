import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimal async loader with reload + stale-response protection. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    try {
      const result = await run()
      if (id === seq.current) { setData(result); setError(null) }
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [run])

  useEffect(() => { void reload() }, [reload])
  return { data, error, loading, reload }
}

/** Throw on Supabase errors so useQuery can surface them. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
