import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminContext } from '@/context/adminContext'
import {
  emptyAdmin,
  loadAdmin,
  resolveFlag,
  setAccountState,
  stopListing,
} from '@/data/admin'

function describeError(error) {
  return error?.message || 'Something went wrong'
}

export function AdminProvider({ children }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ attempt: null, data: emptyAdmin(), error: null })

  useEffect(() => {
    let active = true

    loadAdmin().then(
      (data) => active && setResult({ attempt, data, error: null }),
      (error) =>
        active && setResult({ attempt, data: emptyAdmin(), error: describeError(error) }),
    )

    return () => {
      active = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setResult((current) => (current.error ? { ...current, error: null } : current))
    setAttempt((count) => count + 1)
  }, [])

  const act = useCallback(
    async (write) => {
      const outcome = await write()
      if (!outcome.local) reload()
      return outcome
    },
    [reload],
  )

  const value = useMemo(
    () => ({
      ...result.data,
      loading: result.attempt !== attempt,
      error: result.error,
      reload,
      setAccountState: (profileId, next, reason) =>
        act(() => setAccountState(profileId, next, reason)),
      resolveFlag: (flagId, resolution) => act(() => resolveFlag(flagId, resolution)),
      stopListing: (flagId, reason) => act(() => stopListing(flagId, reason)),
    }),
    [result, attempt, reload, act],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}