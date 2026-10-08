import { createContext, useContext } from 'react'

export const AdminContext = createContext(null)

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) throw new Error('useAdmin must be used inside <AdminProvider>')
  return context
}
