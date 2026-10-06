import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminContext } from '@/context/adminContext'
import { describeError, supabaseReady } from '@/lib/supabase'
import {
  emptyAdmin,
  loadAdmin,
  resolveFlag,
  seedAdmin,
  setAccountState,
  stopListing,
} from '@/data/admin'

/**
 * Everything the operator screens read, and the three things they can write.
 *
 * It sits above `AdminShell` rather than inside each screen because the shell's
 * own tab badges are counts — the ID queue and the flag queue — and a shell that
 * fetched them separately would show a different number to the page it is
 * framing.
 *
 * Writes go through here too, and each one re-reads afterwards instead of
 * patching local state. An operator suspending an account changes a summary, a
 * badge and a queue at once; re-reading is how those stay consistent, and it also
 * means the screen shows what Postgres actually did rather than what the client
 * assumed it would.
 */

export function AdminProvider({ children }) {
  /** Which load has been asked for. Bumped by `reload` and by every write. */
  const [attempt, setAttempt] = useState(0)

  /**
   * The load that came back, stamped with the attempt that produced it — so
   * `loading` is a comparison rather than a flag an effect has to set on the way
   * in. It also means a refetch keeps the figures it already has: an operator
   * verifying an account watches the badge change, not the page empty out.
   */
  const [result, setResult] = useState(() =>
    supabaseReady
      ? { attempt: null, data: emptyAdmin(), error: null }
      : { attempt: 0, data: seedAdmin(), error: null },
  )

  useEffect(() => {
    if (!supabaseReady) return

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

  /**
   * Clears the previous failure as well as asking again, so "Try again" does not
   * leave the operator reading the error it is already retrying.
   */
  const reload = useCallback(() => {
    setResult((current) => (current.error ? { ...current, error: null } : current))
    setAttempt((count) => count + 1)
  }, [])

  /**
   * Wraps a write so a screen gets one thing back: what happened. `local` is true
   * when there was no project to write to, which the screens say on the page —
   * a decision that quietly disappears on reload is worse than one that was
   * never offered.
   */
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
