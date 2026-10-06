import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { AppShell } from '@/components/layout/AppShell'
import { AdminShell } from '@/components/admin/AdminShell'
import { AdminProvider } from '@/context/AdminProvider'
import { Icon } from '@/components/Icon'
import { ErrorState } from '@/components/ui/Feedback'
import { Landing } from '@/routes/Landing'
import { Market } from '@/routes/Market'
import { ListingDetail } from '@/routes/ListingDetail'
import { Dashboard } from '@/routes/Dashboard'
import { Payouts } from '@/routes/Payouts'
import { NewListing } from '@/routes/NewListing'
import { SignIn } from '@/routes/SignIn'
import { NotFound } from '@/routes/NotFound'
import { AdminOverview } from '@/routes/admin/Overview'
import { AdminRegistrations } from '@/routes/admin/Registrations'
import { AdminModeration } from '@/routes/admin/Moderation'
import { AdminSettlement } from '@/routes/admin/Settlement'

/**
 * Restores scroll on navigation and honours `#anchor` links, which the router
 * does not do on its own.
 */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])

  return null
}

/** Public pages: header, content, footer. */
function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="flex items-center gap-2 text-sm text-fg-3" role="status">
          <Icon name="spinner" className="animate-spin text-base" />
          Checking your session…
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

/**
 * Keeps the operator screens out of the way of everyone else. A signed-in farmer
 * who types `/admin` lands back on their own dashboard rather than a wall — they
 * have not done anything wrong, there is just nothing for them here.
 *
 * This hides the interface. It does not protect the data: `is_staff` comes off
 * the profile row, and every `admin_*` function in the migration re-checks it in
 * Postgres, so a forged flag in this bundle buys nothing but a broken page.
 */
function RequireAdmin() {
  const { user, loading, admin, profileError } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="flex items-center gap-2 text-sm text-fg-3" role="status">
          <Icon name="spinner" className="animate-spin text-base" />
          Checking your session…
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />
  }

  // A profile that failed to load is not the same as someone at the wrong door.
  // Redirecting on it would tell an operator on a dropped connection that they
  // had lost their access, so say what actually happened. The fetch lives in the
  // auth provider and has no retry handle of its own, hence the reload.
  if (profileError) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          className="max-w-md"
          title="Couldn’t check your access"
          detail={profileError}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="market" element={<Market />} />
          <Route path="market/:id" element={<ListingDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="signin" element={<SignIn mode="signin" />} />
        <Route path="signup" element={<SignIn mode="signup" />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard/payouts" element={<Payouts />} />
            <Route path="new" element={<NewListing />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          {/* The provider wraps the shell, not the pages: the shell's own tab
              badges are counts — the ID queue, the flag queue — and fetching
              them separately from the page they frame is how the two end up
              disagreeing. It is inside `RequireAdmin` so the `admin_*` calls are
              never made by someone who would only be refused. */}
          <Route
            path="admin"
            element={
              <AdminProvider>
                <AdminShell />
              </AdminProvider>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="registrations" element={<AdminRegistrations />} />
            <Route path="lots" element={<AdminModeration />} />
            <Route path="settlement" element={<AdminSettlement />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
