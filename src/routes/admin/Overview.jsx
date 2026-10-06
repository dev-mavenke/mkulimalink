import { Link } from 'react-router-dom'
import { CHANNELS, STATES } from '@/data/people'
import { HEALTH } from '@/data/ops'
import { useAdmin } from '@/context/adminContext'
import { money, moneyCompact, number, timeAgo } from '@/lib/format'
import { PageHeader, Stat } from '@/components/layout/PageHeader'
import { SignupBars } from '@/components/admin/SignupBars'
import { Head, Row, Table, Td, Th } from '@/components/admin/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/Icon'

/**
 * The morning read.
 *
 * Ordered by what an operator can do something about, not by what is easiest to
 * measure: the queues that need a person come first, growth comes second, and
 * the service status sits at the bottom where it is checked rather than watched.
 */
export function AdminOverview() {
  const {
    registrations,
    countyBreakdown,
    peopleSummary,
    signupsByDay,
    opsSummary,
    systemChecks,
    source,
    loading,
    error,
    reload,
  } = useAdmin()

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ErrorState
          title="The dashboard didn’t load"
          detail={error}
          onRetry={reload}
        />
      </div>
    )
  }

  // Every figure on this page is an aggregate, and `emptyAdmin()` makes them all
  // zero. Rendering that while the first query is in flight would tell an operator
  // there is nothing in any queue this morning — so the page waits instead. A
  // later refetch keeps the figures it already has, which are real.
  if (loading && source === null) {
    return (
      <div
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
        role="status"
        aria-label="Loading the dashboard"
      >
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-9 w-72" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    )
  }

  const newest = registrations.slice(0, 6)
  const topCounties = countyBreakdown.slice(0, 6)
  const fortnight = signupsByDay.reduce((total, day) => total + day.total, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Operations"
        title="Today at the exchange"
        description={
          source === 'supabase'
            ? 'Every queue below needs a person. Figures come straight from Postgres.'
            : 'Every queue below needs a person. No project is connected, so these are the seeded figures.'
        }
        actions={
          <Button to="/admin/registrations" variant="secondary" iconAfter="arrowRight">
            All registrations
          </Button>
        }
      />

      {/* What needs doing, before anything that is merely interesting. */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Awaiting ID check"
          value={number(peopleSummary.awaitingId)}
          sub="Cannot trade until verified"
        />
        <Stat
          label="Lots flagged"
          value={number(opsSummary.flags)}
          sub={`${opsSummary.urgentFlags} stopped from trading`}
        />
        <Stat
          label="Held to weigh-in"
          value={moneyCompact(opsSummary.held)}
          sub="Released when both sides confirm"
        />
        <Stat
          label="Failed payouts"
          value={moneyCompact(opsSummary.failed)}
          sub="Needs a manual retry"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <SignupBars days={signupsByDay} />
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-fg">Where growth is coming from</h2>
          <p className="eyebrow mt-1 text-fg-3">
            {peopleSummary.countiesCovered} of {peopleSummary.countiesTotal} counties active
          </p>

          <ol className="mt-4 grid gap-2.5">
            {topCounties.map((entry) => (
              <li key={entry.county} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-fg-2">{entry.county}</span>
                  <span className="tnum shrink-0 font-mono text-fg">{entry.total}</span>
                </div>
                {/* Bar length carries the comparison; the number carries the value. */}
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(entry.total / topCounties[0].total) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-4 border-t border-rule pt-3 text-xs text-fg-3">
            {peopleSummary.ussdShare}% of accounts signed up over USSD, so SMS price alerts cannot
            be retired yet.
          </p>
        </div>
      </div>

      {/* ---- Newest accounts -------------------------------------------- */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-3">
          <div>
            <h2 className="text-base font-semibold text-fg">Just registered</h2>
            <p className="mt-1 text-sm text-fg-2">
              {number(fortnight)} accounts in the last fortnight — {peopleSummary.farmers} farmers
              and {peopleSummary.buyers} buyers in total.
            </p>
          </div>
          <Link
            to="/admin/registrations"
            className="text-sm font-medium text-brand hover:underline"
          >
            See all {number(peopleSummary.total)}
          </Link>
        </div>

        <Table caption="The six most recent accounts" className="mt-3" minWidth="40rem">
          <Head>
            <Th>Account</Th>
            <Th>Role</Th>
            <Th>County</Th>
            <Th>Signed up</Th>
            <Th>State</Th>
          </Head>
          <tbody>
            {newest.map((person) => (
              <Row key={person.id}>
                <Td>
                  <Link
                    to={`/admin/registrations?q=${encodeURIComponent(person.name)}`}
                    className="font-semibold text-fg hover:underline"
                  >
                    {person.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-fg-3">
                    {person.accountNo} · {CHANNELS[person.channel].label}
                  </span>
                </Td>
                <Td className="capitalize">{person.role}</Td>
                <Td>{person.county}</Td>
                <Td>{timeAgo(person.joinedAt)}</Td>
                <Td>
                  <Badge tone={STATES[person.state].tone}>{STATES[person.state].label}</Badge>
                </Td>
              </Row>
            ))}
          </tbody>
        </Table>
      </section>

      {/* ---- Service status --------------------------------------------- */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-3">
          <h2 className="text-base font-semibold text-fg">Services</h2>
          <p className="eyebrow text-fg-3">
            {opsSummary.degraded === 0
              ? 'All operating'
              : `${opsSummary.degraded} not operating normally`}
          </p>
        </div>

        <ul className="mt-3 grid gap-px overflow-hidden rounded-panel border border-rule bg-rule sm:grid-cols-2">
          {systemChecks.map((check) => {
            const health = HEALTH[check.state]
            return (
              <li key={check.id} className="bg-surface-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={health.icon}
                      className={
                        check.state === 'ok'
                          ? 'text-base text-brand'
                          : check.state === 'warning'
                            ? 'text-base text-warn-fg'
                            : 'text-base text-alert'
                      }
                    />
                    <h3 className="text-[0.9375rem] font-semibold text-fg">{check.label}</h3>
                  </div>
                  <Badge tone={health.tone}>{health.label}</Badge>
                </div>
                <p className="mt-2 text-sm text-fg-2">{check.detail}</p>
                <p className="eyebrow mt-2 text-fg-3">{check.meta}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---- Money ------------------------------------------------------ */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-3">
          <h2 className="text-base font-semibold text-fg">Money</h2>
          <Link to="/admin/settlement" className="text-sm font-medium text-brand hover:underline">
            Open settlement
          </Link>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="eyebrow text-fg-3">Fees earned today</dt>
            <dd className="tnum mt-1.5 font-mono text-xl font-semibold text-fg">
              {money(opsSummary.feesToday)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-fg-3">Releasing now</dt>
            <dd className="tnum mt-1.5 font-mono text-xl font-semibold text-fg">
              {money(opsSummary.releasing)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-fg-3">Lifetime through platform</dt>
            <dd className="tnum mt-1.5 font-mono text-xl font-semibold text-fg">
              {moneyCompact(peopleSummary.gmv)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
