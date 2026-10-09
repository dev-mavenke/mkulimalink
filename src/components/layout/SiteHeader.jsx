
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/authContext'
import { useTheme } from '@/context/themeContext'
import { Icon, Logo } from '@/components/Icon'
import { Button } from '@/components/ui/Button'

const LINKS = [
  { to: '/market', label: 'Market' },
  { to: '/#how', label: 'How it works' },
  { to: '/#buyers', label: 'For buyers' },
  { to: '/transporter', label: 'Transporter' },
]

export function ThemeToggle({ className }) {
  const { dark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'grid size-9 place-items-center rounded-field text-fg-2',
        'transition-colors hover:bg-surface-2 hover:text-fg',
        className,
      )}
      aria-pressed={dark}
    >
      <Icon name={dark ? 'sun' : 'moon'} className="text-lg" />
      <span className="sr-only">
        Switch to {dark ? 'light' : 'dark'} theme
      </span>
    </button>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { user, admin } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="rounded-sm" aria-label="MkulimaLink home">
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <nav
          className="ml-4 hidden items-center gap-1 md:flex"
          aria-label="Main"
        >
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'rounded-field px-3 py-2 text-sm font-medium transition-colors',
                  isActive && link.to === '/market'
                    ? 'bg-surface-2 text-fg'
                    : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {admin ? (
            <Button
              to="/admin"
              variant="board"
              size="sm"
              icon="shield"
              className="hidden sm:inline-flex"
            >
              Operator
            </Button>
          ) : null}

          {user ? (
            <Button
              to="/dashboard"
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
            >
              My lots
            </Button>
          ) : (
            <Button
              to="/signin"
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              Sign in
            </Button>
          )}

          {admin ? null : (
            <Button
              to="/new"
              size="sm"
              icon="plus"
              className="hidden sm:inline-flex"
            >
              Post a harvest
            </Button>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="grid size-9 place-items-center rounded-field text-fg-2 hover:bg-surface-2 hover:text-fg md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <Icon name={open ? 'close' : 'menu'} className="text-xl" />
            <span className="sr-only">
              {open ? 'Close menu' : 'Open menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {open ? (
        <nav
          id="mobile-nav"
          onClick={() => setOpen(false)}
          className="border-t border-rule bg-surface px-4 py-3 md:hidden"
          aria-label="Main"
        >
          <ul className="grid gap-1">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="block rounded-field px-3 py-2.5 text-sm font-medium text-fg-2 hover:bg-surface-2 hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 grid gap-2 border-t border-rule pt-3">
            {admin ? (
              <Button to="/admin" variant="board" icon="shield" fullWidth>
                Operator view
              </Button>
            ) : null}

            <Button
              to={user ? '/dashboard' : '/signin'}
              variant="secondary"
              fullWidth
            >
              {user ? 'My lots' : 'Sign in'}
            </Button>

            {admin ? null : (
              <Button to="/new" icon="plus" fullWidth>
                Post a harvest
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  )
}