import { useCallback, useEffect, useMemo, useState } from 'react'
import { MarketContext } from '@/context/marketContext'
import { describeError, supabaseReady } from '@/lib/supabase'
import { emptyMarket, loadMarket, seedMarket } from '@/data/market'

/**
 * Today's board and the open lots, fetched once for the whole app.
 *
 * One provider rather than a fetch per screen: the landing page, the market, a
 * lot's own page and the sign-in panel are all reading the same board, and four
 * copies of it would be four chances for them to disagree on a Tuesday morning
 * when the prices change between renders.
 *
 * With no project configured this starts out already holding the seeded market,
 * so the first paint has real rows in it instead of a skeleton that resolves a
 * tick later.
 */

export function MarketProvider({ children }) {
  /** Which load has been asked for. Bumped by `reload`, and nothing else. */
  const [attempt, setAttempt] = useState(0)

  /**
   * The load that came back, stamped with the attempt that produced it — so
   * `loading` is a comparison rather than a flag an effect has to set on the way
   * in. Setting a status to 'loading' at the top of the fetch effect renders
   * twice for every load and reads as ready for the frame in between; React's
   * own lint rule refuses it, and it is right to.
   */
  const [result, setResult] = useState(() =>
    supabaseReady
      ? { attempt: null, data: emptyMarket(), error: null }
      : { attempt: 0, data: seedMarket(), error: null },
  )

  useEffect(() => {
    if (!supabaseReady) return

    let active = true

    loadMarket().then(
      (data) => active && setResult({ attempt, data, error: null }),
      (error) =>
        active && setResult({ attempt, data: emptyMarket(), error: describeError(error) }),
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

  const value = useMemo(
    () => ({
      ...result.data,
      loading: result.attempt !== attempt,
      error: result.error,
      reload,
    }),
    [result, attempt, reload],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}
