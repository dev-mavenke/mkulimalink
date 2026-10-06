import { createContext, useContext } from 'react'

/**
 * Kept apart from `ThemeProvider.jsx` so that file exports only a component and
 * Fast Refresh can replace the provider without dropping the tree's state.
 */
export const ThemeContext = createContext(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
