import { useCallback, useEffect, useMemo, useState } from 'react'
import { MarketContext } from '@/context/marketContext'
import { emptyMarket, seedMarket } from '@/data/market'
import { hydrateListing } from '@/data/seed/listings'

const API = ''

function withLookups(data) {
  const boardRows = data.boardRows ?? []
  const listings = (data.listings ?? []).map((row) =>
    hydrateListing({
      ...row,
      postedAt: row.postedAt ? new Date(row.postedAt) : new Date(),
    }),
  )
  const boardIndex = new Map(boardRows.map((row) => [row.id, row]))
  const listingIndex = new Map(listings.map((listing) => [listing.id, listing]))
  return {
    ...data,
    boardRows,
    listings,
    boardSummary: data.boardSummary ?? {
      averageUplift: 0,
      buyers: 0,
      farmers: 0,
    },
    boardRowFor: (cropId) => boardIndex.get(cropId),
    listingById: (id) => listingIndex.get(id),
  }
}

export function MarketProvider({ children }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ attempt: null, data: emptyMarket(), error: null })

  useEffect(() => {
    let active = true

    fetch(`${API}/api/market`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.message || 'Could not load the market')
        return body
      })
      .then((data) => {
        if (active) setResult({ attempt, data: withLookups(data), error: null })
      })
      .catch(() => {
        if (active) setResult({ attempt, data: seedMarket(), error: null })
      })

    return () => {
      active = false
    }
  }, [attempt])

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