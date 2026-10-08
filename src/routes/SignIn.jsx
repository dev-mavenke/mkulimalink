import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { useMarket } from '@/context/marketContext'
import { number, percent } from '@/lib/format'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Icon, Logo } from '@/components/Icon'

export function SignIn({ mode = 'signin' }) {
  const isSignUp = mode === 'signup'
  const { user, profile, signIn, signUp, demo } = useAuth()
  const market = useMarket()
  const boardSummary = market?.boardSummary ?? { averageUplift: 0, buyers: 0, farmers: 0 }
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [confirmSent, setConfirmSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function homeFor(nextProfile) {
    return nextProfile?.isStaff ? '/admin' : (location.state?.from ?? '/dashboard')
  }

  if (user) return <Navigate to={homeFor(profile)} replace />

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError(null)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const signedInProfile = isSignUp
        ? await signUp(form.name, form.email, form.password)
        : await signIn(form.email, form.password)
      if (signedInProfile?.awaitingConfirmation) {
        setConfirmSent(true)
        setSubmitting(false)
        return
      }
      navigate(homeFor(signedInProfile), { replace: true })
    } catch (caught) {
      setError(caught.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,28rem)]">
      <aside className="hidden flex-col justify-between bg-board p-12 lg:flex">
        <Link to="/" className="rounded-sm">
          <Logo tone="board" />
        </Link>

        <div>
          <p className="eyebrow text-marigold">Why farmers sign up</p>
          <p className="masthead mt-4 max-w-md text-[2.5rem] text-board-fg">
            {boardSummary.averageUplift > 0
              ? `${percent(boardSummary.averageUplift)} more than the broker at your gate.`
              : 'More than the broker at your gate.'}
          </p>
          <p className="mt-5 max-w-sm text-sm text-board-fg-2">
            Averaged across every crop on today&rsquo;s board. {number(boardSummary.buyers)} verified
            buyers are bidding right now.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-6 border-t border-board-3 pt-6">
          <div>
            <dt className="eyebrow text-board-fg-3">Farmers selling</dt>
            <dd className="tnum mt-1.5 font-mono text-xl font-semibold text-board-fg">
              {number(boardSummary.farmers)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-board-fg-3">Settled by M-Pesa</dt>
            <dd className="mt-1.5 font-mono text-xl font-semibold text-board-fg">Same day</dd>
          </div>
        </dl>
      </aside>

      <main id="main" className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="inline-block rounded-sm lg:hidden">
            <Logo />
          </Link>

          <h1 className="masthead mt-8 text-[2rem] text-fg lg:mt-0">
            {confirmSent ? 'Check your inbox' : isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-fg-2">
            {confirmSent
              ? `We sent a confirmation link to ${form.email}. Open it and you’re in.`
              : isSignUp
                ? 'Free for farmers. You only need an email and a password.'
                : 'Sign in to see your lots and the bids on them.'}
          </p>

          {confirmSent ? (
            <div className="mt-7 grid gap-4">
              <p className="flex items-start gap-2 rounded-field bg-brand-wash px-3 py-2.5 text-xs leading-snug text-brand">
                <Icon name="info" className="mt-px shrink-0 text-sm" />
                The link expires in an hour. If it doesn’t arrive, check the spam folder before
                signing up again — the account already exists.
              </p>
              <Button to="/signin" size="lg" fullWidth variant="secondary">
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {demo ? (
                <p className="mt-5 flex items-start gap-2 rounded-field bg-marigold-soft px-3 py-2.5 text-xs leading-snug text-board dark:bg-marigold/15 dark:text-marigold">
                  <Icon name="info" className="mt-px shrink-0 text-sm" />
                  No project is connected, so any email and password starts a local demo session —
                  including the operator dashboard, which has nothing to check you against.
                </p>
              ) : null}

              <form onSubmit={onSubmit} noValidate className="mt-7 grid gap-5">
                {isSignUp ? (
                  <Field label="Your name" required>
                    {(props) => (
                      <Input
                        {...props}
                        autoComplete="name"
                        placeholder="Grace Wanjiku"
                        value={form.name}
                        onChange={update('name')}
                      />
                    )}
                  </Field>
                ) : null}

                <Field label="Email" required>
                  {(props) => (
                    <Input
                      {...props}
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={update('email')}
                    />
                  )}
                </Field>

                <Field
                  label="Password"
                  required
                  hint={isSignUp ? 'At least six characters.' : undefined}
                  error={error}
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="password"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={update('password')}
                    />
                  )}
                </Field>

                <Button type="submit" size="lg" fullWidth loading={submitting}>
                  {submitting
                    ? isSignUp
                      ? 'Creating account…'
                      : 'Signing in…'
                    : isSignUp
                      ? 'Create account'
                      : 'Sign in'}
                </Button>
              </form>

              <p className="mt-6 text-sm text-fg-2">
                {isSignUp ? 'Already selling with us? ' : 'New to MkulimaLink? '}
                <Link
                  to={isSignUp ? '/signin' : '/signup'}
                  className="font-semibold text-brand hover:underline"
                >
                  {isSignUp ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}