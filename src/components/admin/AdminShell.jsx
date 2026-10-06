import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/authContext'
import { useAdmin } from '@/context/adminContext'
import { number } from '@/lib/format'
import { Icon, Logo } from '@/components/Icon'
import { ThemeToggle } from '@/components/layout/SiteHeader'

/**
 * The operator shell.
 *
 * Deliberately not the farmer shell. The rail is board-dark in both themes, the
 * way the price board is, because an operator is sitting *at* the board rather
 * than reading it — and because a page that can suspend accounts and release
 * money should never be mistaken for the one that posts a lot of tomatoes.
 *
 * There is no bottom tab bar here either. That pattern exists in the farmer app
 * because farmers are one-handed in a field; operators are at a desk, so this
 * one scrolls a tab strip on narrow screens and keeps the desk metaphor.
 */

/**
 * The tabs are built per render rather than declared at module scope, because two
 * of them carry a count. A constant would have been read once, at import, and the
 * badge would then disagree with the page it sits next to for the rest of the
 * session.
 */
function tabsFor({ awaitingId, flags }) {
  return [
    { to: '/admin', label: 'Overview', icon: 'board', end: true },
    { to: '/admin/registrations', label: 'Registrations', icon: 'user', count: awaitingId },
    { to: '/admin/lots', label: 'Lots', icon: 'sprout', count: flags },
    { to: '/admin/settlement', label: 'Settlement', icon: 'wallet' },
  ]
}

function TabBadge({ count }) {
  if (!count) return null
  return (
    <span className="tnum ml-auto rounded-full bg-marigold px-1.5 py-0.5 font-mono text-[0.625rem] leading-none font-semibold text-board">
      {count}
      <span className="sr-only"> needing attention</span>
    </span>
  )
}

export function AdminShell() {
  const { user, signOut, demo } = useAuth()
  const { peopleSummary, opsSummary, source } = useAdmin()

  const tabs = tabsFor({ awaitingId: peopleSummary.awaitingId, flags: opsSummary.flags })

  return (
    <div className="min-h-dvh bg-surface md:grid md:grid-cols-[15.5rem_1fr]">
      {/* The right border only earns its keep in dark mode, where the rail and the
          page surface are two close greens and the edge would otherwise mush. */}
      <aside className="sticky top-0 z-30 hidden h-dvh flex-col border-r border-board-3 bg-board px-3 py-5 text-board-fg md:flex">
        <NavLink to="/" className="rounded-sm px-2" aria-label="MkulimaLink home">
          <Logo tone="board" />
        </NavLink>

        <p className="eyebrow mt-6 border-t-2 border-marigold px-2 pt-3 text-marigold">
          Operator view
        </p>

        <nav className="mt-3 grid gap-1" aria-label="Operations">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-field px-2.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-board-3 text-board-fg'
                    : 'text-board-fg-2 hover:bg-board-2 hover:text-board-fg',
                )
              }
            >
              <Icon name={tab.icon} className="text-lg" />
              {tab.label}
              <TabBadge count={tab.count} />
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto grid gap-3 border-t border-board-3 pt-4">
          {opsSummary.degraded > 0 ? (
            <NavLink
              to="/admin"
              className="flex items-start gap-2 rounded-field bg-board-2 px-2.5 py-2 text-xs leading-snug text-board-fg-2 hover:text-board-fg"
            >
              <Icon name="bell" className="mt-px shrink-0 text-sm text-marigold" />
              {opsSummary.degraded} {opsSummary.degraded === 1 ? 'service is' : 'services are'} degraded
            </NavLink>
          ) : null}

          <div className="px-1">
            <p className="truncate text-xs font-semibold text-board-fg">{user?.email}</p>
            <div className="mt-1 flex items-center gap-4">
              <NavLink to="/dashboard" className="text-xs text-board-fg-3 hover:text-board-fg hover:underline">
                Farmer view
              </NavLink>
              <button
                type="button"
                onClick={signOut}
                className="text-xs text-board-fg-3 hover:text-board-fg hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Narrow screens: the same rail, laid flat and scrollable. */}
        <header className="sticky top-0 z-30 border-b-2 border-marigold bg-board text-board-fg md:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <NavLink to="/" className="rounded-sm" aria-label="MkulimaLink home">
              <Logo tone="board" showText={false} />
            </NavLink>
            <span className="eyebrow text-marigold">Operator</span>
            <ThemeToggle className="ml-auto text-board-fg-2 hover:bg-board-2 hover:text-board-fg" />
            <button
              type="button"
              onClick={signOut}
              className="text-xs text-board-fg-3 hover:text-board-fg hover:underline"
            >
              Sign out
            </button>
          </div>

          <nav className="-mb-px flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Operations">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-field px-2.5 py-2 text-sm font-medium whitespace-nowrap',
                    isActive ? 'bg-board-3 text-board-fg' : 'text-board-fg-2',
                  )
                }
              >
                <Icon name={tab.icon} className="text-base" />
                {tab.label}
                <TabBadge count={tab.count} />
              </NavLink>
            ))}
          </nav>
        </header>

        <div className="hidden items-center gap-3 border-b border-rule px-6 py-2.5 md:flex">
          {/* `source` is null only until the first load lands. Printing the zeros
              from `emptyAdmin()` until then would read as a quiet morning rather
              than an unfinished query — so the strip says what it is doing. A
              later refetch keeps the previous figures, which are real. */}
          <p className="eyebrow text-fg-3">
            {source === null
              ? 'Reading the exchange…'
              : `${number(peopleSummary.total)} accounts · ${number(opsSummary.openLots)} lots open`}
          </p>
          {demo ? (
            <p className="eyebrow flex items-center gap-1.5 border-l border-rule pl-3 text-warn-fg">
              <Icon name="info" className="text-sm" />
              Seeded — nothing is being written
            </p>
          ) : null}
          <ThemeToggle className="ml-auto size-8" />
        </div>

        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
