import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/context/authContext'

const DEMO_KEY = 'mkulimalink:demo-user'
const API = ''

function readDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function demoProfile(user) {
  return {
    id: 'demo',
    accountNo: 'u-demo',
    name: user.name,
    email: user.email,
    role: 'farmer',
    state: 'active',
    county: null,
    isStaff: true,
  }
}

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    if (!res.ok) throw new Error(data.message || 'Request failed')
    return data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(text.slice(0, 180) || 'Empty response')
    }
    throw error
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readDemoUser())
  const [profile, setProfile] = useState(() => (readDemoUser() ? demoProfile(readDemoUser()) : null))
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    let active = true
    fetch(`${API}/api/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.user) return
        setUser(data.user)
        setProfile(data.profile)
      })
      .catch((error) => {
        if (active) setProfileError(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const startDemoSession = useCallback((email) => {
    const next = { id: 'demo', email, name: email.split('@')[0], demo: true }
    localStorage.setItem(DEMO_KEY, JSON.stringify(next))
    setUser(next)
    setProfile(demoProfile(next))
    return demoProfile(next)
  }, [])

  const signIn = useCallback(async (email, password) => {
    const data = await post('/api/signin', { email, password })
    setUser(data.user)
    setProfile(data.profile)
    return data.profile
  }, [])

  const signUp = useCallback(async (name, email, password) => {
    const data = await post('/api/signup', { name, email, password })
    setUser(data.user)
    setProfile(data.profile)
    return data.profile
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEMO_KEY)
    await fetch(`${API}/api/signout`, { method: 'POST', credentials: 'include' }).catch(() => {})
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      profileError,
      loading,
      signIn,
      signUp,
      signOut,
      startDemoSession,
      demo: user?.demo === true,
      admin: profile?.isStaff === true,
    }),
    [user, profile, profileError, loading, signIn, signUp, signOut, startDemoSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}