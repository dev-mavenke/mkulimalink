import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '@/context/themeContext'

const STORAGE_KEY = 'mkulimalink:theme'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStored() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'dark' || saved === 'light' ? saved : null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }) {
  // `null` means "follow the system", which is the default until someone picks.
  const [preference, setPreference] = useState(readStored)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const dark = preference ? preference === 'dark' : systemDark

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#071a17' : '#edf2ee')
  }, [dark])

  const toggle = useCallback(() => {
    setPreference((current) => {
      const next = (current ? current === 'dark' : systemPrefersDark()) ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* private mode: the choice just won't survive a reload */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ dark, toggle }), [dark, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
