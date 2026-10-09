
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/authContext'
import { Icon, Logo } from '@/components/Icon'
import { ThemeToggle } from '@/components/layout/SiteHeader'

/**
 * The signed-in shell.
 *
 * A bottom tab bar on phones and a rail on desktop.
 * Includes the Transporter module for managing registered trucks.
 */

const TABS = [
  { to: '/dashboard', label: 'My lots', icon: 'sprout', end: true },
  { to: '/market', label: 'Market', icon: 'board' },
  { to: '/new', label: 'Post', icon: 'plus' },
  { to: '/transporter', label: 'Transport', icon: 'truck' },
  { to: '/dashboard/payouts', label: 'Payouts', icon: 'wallet' },
]

export function AppShell() {
  const { user, signOut, demo, admin } = useAuth()

  return (
    <div className="min-h-dvh bg-surface md:grid md:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule bg-surface-2 px-3 py-5 md:flex">
        <NavLink
          to="/"
          className="rounded-sm px-2"
          aria-label="MkulimaLink home"
        >
          <Logo />
        </NavLink>

        <nav className="mt-7 grid gap-1" aria-label="Your account">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-field px-2.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-wash text-brand'
                    : 'text-fg-2 hover:bg-surface-3 hover:text-fg',
                )
              }
            >
              <Icon name={tab.icon} className="text-lg" />
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto grid gap-2 border-t border-rule pt-4">
          {admin ? (
            <NavLink
              to="/admin"
              className="flex items-center gap-2 rounded-field bg-board px-2.5 py-2 text-xs font-semibold text-board-fg transition-colors hover:bg-board-2"
            >
              <Icon name="shield" className="text-base text-marigold" />
              Operator view
            </NavLink>
          ) : null}

          {demo ? (
            <p className="rounded-field bg-marigold-soft px-2.5 py-2 text-xs leading-snug text-board dark:bg-marigold/15 dark:text-marigold">
              Demo session — no Firebase project connected.
            </p>
          ) : null}

          <div className="flex items-center gap-2 px-1">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-board text-xs font-semibold text-board-fg">
              {user?.name?.[0]?.toUpperCase() ?? '·'}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-fg">
                {user?.name}
              </span>

              <button
                type="button"
                onClick={signOut}
                className="text-xs text-fg-3 hover:text-fg hover:underline"
              >
                Sign out
              </button>
            </span>

            <ThemeToggle className="size-8" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rule bg-surface/90 px-4 backdrop-blur-md md:hidden">
          <NavLink
            to="/"
            className="rounded-sm"
            aria-label="MkulimaLink home"
          >
            <Logo showText={false} />
          </NavLink>

          <span className="truncate text-sm font-semibold text-fg">
            {user?.name}
          </span>

          <span className="ml-auto flex items-center gap-1">
            {admin ? (
              <NavLink
                to="/admin"
                className="grid size-9 place-items-center rounded-field text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Icon name="shield" className="text-lg" />
                <span className="sr-only">Operator view</span>
              </NavLink>
            ) : null}

            <ThemeToggle />
          </span>
        </header>

        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Your account"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium transition-colors',
                isActive ? 'text-brand' : 'text-fg-3',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid h-7 w-11 place-items-center rounded-full transition-colors',
                    isActive && 'bg-brand-wash',
                  )}
                >
                  <Icon name={tab.icon} className="text-lg" />
                </span>

                <span className="max-w-full truncate px-0.5">
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}