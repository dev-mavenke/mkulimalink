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

function RequireFarmer() {
  const { user, profile, loading } = useAuth()
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

  if (profile?.isStaff) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}

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

        <Route element={<RequireFarmer />}>
          <Route element={<AppShell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard/payouts" element={<Payouts />} />
            <Route path="new" element={<NewListing />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
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