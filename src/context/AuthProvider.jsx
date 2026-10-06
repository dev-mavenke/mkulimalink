import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/context/authContext'
import { describeError, supabase, supabaseReady } from '@/lib/supabase'

/**
 * Who is signed in, and what they are allowed to be offered.
 *
 * Two things live here, and they are not the same thing. `user` is the GoTrue
 * session. `profile` is the row in `public.profiles` that the signup trigger
 * created for it — the market participant, with the county, the account number
 * and the `is_staff` flag.
 *
 * `admin` comes off that flag rather than off a list of email addresses in this
 * bundle. The allowlist is `public.staff_emails`, which only a `security definer`
 * trigger reads; the client can no more grant itself the flag than read the
 * table. This still only decides what the interface *offers* — every operator
 * function re-checks `is_staff()` in Postgres, so hiding the tab is a courtesy
 * and the refusal is the boundary.
 */

const DEMO_KEY = 'mkulimalink:demo-user'

const PROFILE_COLUMNS = 'id, account_no, name, email, role, state, county, is_staff'

function readDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function mapUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Farmer',
  }
}

function mapProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    accountNo: row.account_no,
    name: row.name,
    email: row.email,
    role: row.role,
    state: row.state,
    county: row.county,
    isStaff: row.is_staff,
  }
}

/**
 * The stand-in profile for a demo session.
 *
 * `isStaff` is true because with no project attached there is nothing to
 * authenticate against — any email and password starts a session, so gating the
 * operator screens on top of that would be a lock on a door with no wall. The
 * sign-in page and the operator shell both say so on the page rather than
 * leaving it to be discovered.
 */
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (supabaseReady ? null : readDemoUser()))
  const [sessionLoading, setSessionLoading] = useState(supabaseReady)

  /**
   * The profile fetch, stamped with the user id it was for.
   *
   * One object rather than a profile, an error and a loading flag, so that "we do
   * not know yet" is a comparison — `fetched.for !== userId` — instead of a flag
   * some effect has to remember to set and clear. A boolean set inside the fetch
   * effect is one render late: the session resolves, `user` lands, and for that
   * one frame it still reads false, which is long enough for `RequireAdmin` to
   * decide a real operator is not staff and redirect them.
   *
   * Signing out is the same comparison read the other way, so there is nothing to
   * tear down: `userId` becomes undefined, the stamp stops matching, and the
   * profile is gone from the same expression that served it.
   */
  const [fetched, setFetched] = useState({ for: null, profile: null, error: null })

  useEffect(() => {
    if (!supabaseReady) return

    let active = true

    // The stored session is read once on mount; after that the subscription is
    // the only thing that moves `user`, including on token refresh and on the
    // recovery link that lands back on /signin.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(mapUser(data.session?.user))
      setSessionLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Nothing is awaited in here on purpose — the client holds a lock for the
      // duration of the callback, and the profile query below would deadlock it.
      setUser(mapUser(session?.user))
      setSessionLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const userId = user?.id

  useEffect(() => {
    if (!supabaseReady || !userId) return

    let active = true

    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        setFetched({
          for: userId,
          profile: mapProfile(data),
          error: error ? describeError(error) : null,
        })
      })

    return () => {
      active = false
    }
  }, [userId])

  /** Only ever this user's row. A stamp from a previous session does not count. */
  const resolved = Boolean(userId) && fetched.for === userId
  const liveProfile = resolved ? fetched.profile : null
  const profileError = resolved ? fetched.error : null

  // Seed mode has no fetch: the profile is a pure function of the demo session,
  // so it is computed rather than stored. An effect here would leave the same
  // one-frame hole as above, with the same consequence.
  const profile = useMemo(
    () => (supabaseReady ? liveProfile : user ? demoProfile(user) : null),
    [liveProfile, user],
  )

  const loading = sessionLoading || (supabaseReady && Boolean(userId) && !resolved)

  const startDemoSession = useCallback((email) => {
    const next = { id: 'demo', email, name: email.split('@')[0], demo: true }
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(next))
    } catch {
      /* the session just won't survive a reload */
    }
    setUser(next)
    return next
  }, [])

  const signIn = useCallback(
    async (email, password) => {
      if (!supabaseReady) {
        startDemoSession(email)
        return {}
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(describeError(error), { cause: error })
      return {}
    },
    [startDemoSession],
  )

  const signUp = useCallback(
    async (name, email, password) => {
      if (!supabaseReady) {
        startDemoSession(email)
        return {}
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Read by the `handle_new_user` trigger, which is what creates the
        // profile row. `role` is not collected on the form yet, so every signup
        // arrives as a farmer and an operator changes it.
        options: { data: { name } },
      })
      if (error) throw new Error(describeError(error), { cause: error })

      // No session means the project has email confirmation on. The caller has
      // to say so instead of navigating to a dashboard the user cannot reach.
      return { awaitingConfirmation: !data.session }
    },
    [startDemoSession],
  )

  const signOut = useCallback(async () => {
    if (!supabaseReady) {
      localStorage.removeItem(DEMO_KEY)
      setUser(null)
      return
    }
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      profileError,
      /** Covers the profile too — see `fetched`. A gate that reads this is
          never asked to rule on a half-loaded identity. */
      loading,
      signIn,
      signUp,
      signOut,
      demo: !supabaseReady,
      /** Whether to *offer* the operator screens. Postgres decides the rest. */
      admin: profile?.isStaff === true,
    }),
    [user, profile, profileError, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
