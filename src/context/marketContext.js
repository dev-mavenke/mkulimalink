import { createContext, useContext } from 'react'

/** Split from `MarketProvider.jsx` for the same reason as the theme context. */
export const MarketContext = createContext(null)

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('useMarket must be used inside <MarketProvider>')
  return context
}
