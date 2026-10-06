import { createContext, useContext } from 'react'

/** Split from `AuthProvider.jsx` for the same reason as the theme context. */
export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
