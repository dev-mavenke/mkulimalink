import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CHANNELS, ROLES, STATES } from '@/data/people'
import { COUNTIES } from '@/data/catalog'
import { useAdmin } from '@/context/adminContext'
import { describeError } from '@/lib/supabase'
import { longDate, money, moneyCompact, number, timeAgo } from '@/lib/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { Head, Row, Table, Td, Th } from '@/components/admin/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/Icon'

const SORTS = {
  newest: { label: 'Newest first', compare: (a, b) => b.joinedAt - a.joinedAt },
  waiting: { label: 'Longest waiting', compare: (a, b) => a.joinedAt - b.joinedAt },
  traded: { label: 'Most traded', compare: (a, b) => b.gmv - a.gmv },
}

/** How many of the ID queue get their decision on this page before it becomes a list. */
const QUEUE_SHOWN = 4

/** Digits only, so `0722 118 004` matches a search for `0722118`. */
function digits(value) {
  return value.replace(/\D/g, '')
}

/**
 * Everyone who has registered.
 *
 * Filter state lives in the URL so an operator can send a colleague "the
 * unverified Bomet farmers who came in over USSD" as a link, and so the browser
 * back button undoes a filter instead of leaving the page.
 */
export function AdminRegistrations() {
  const [params, setParams] = useSearchParams()
  const {
    registrations,
    awaitingVerification,
    peopleSummary,
    setAccountState,
    source,
    loading,
    error,
    reload,
  } = useAdmin()

  /** Which account is mid-write. Held as the id so only that row's buttons wait. */
  const [deciding, setDeciding] = useState(null)
  const [notice, setNotice] = useState(null)

  const filters = {
    q: params.get('q') ?? '',
    role: params.get('role') ?? '',
    state: params.get('state') ?? '',
    county: params.get('county') ?? '',
    channel: params.get('channel') ?? '',
    sort: params.get('sort') ?? 'newest',
  }

  const active = ['q', 'role', 'state', 'county', 'channel'].filter((key) => filters[key])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const results = useMemo(() => {
    const needle = filters.q.trim().toLowerCase()
    const needleDigits = digits(needle)

    const matched = registrations.filter(
      (person) =>
        (!filters.role || person.role === filters.role) &&
        (!filters.state || person.state === filters.state) &&
        (!filters.county || person.county === filters.county) &&
        (!filters.channel || person.channel === filters.channel) &&
        (!needle ||
          person.name.toLowerCase().includes(needle) ||
          person.accountNo.toLowerCase().includes(needle) ||
          // Only the visible digits are searchable, because only the masked
          // number ever reaches this browser. `0722 ••• 004` matches `004`.
          (needleDigits.length > 0 && digits(person.phoneMasked).includes(needleDigits))),
    )

    return [...matched].sort(SORTS[filters.sort]?.compare ?? SORTS.newest.compare)
  }, [
    registrations,
    filters.q,
    filters.role,
    filters.state,
    filters.county,
    filters.channel,
    filters.sort,
  ])

  /**
   * Verify, or hold for a closer look.
   *
   * The reason is written into `admin_actions` alongside the operator's id, so
   * the trail records what a click meant rather than only that the state moved.
   */
  const decide = async (person, next, reason) => {
    setDeciding(person.id)
    setNotice(null)
    try {
      const result = await setAccountState(person.id, next, reason)
      setNotice(
        result.local
          ? {
              tone: 'warn',
              text: `No project is connected, so ${person.name} was not changed.`,
            }
          : {
              tone: 'brand',
              text:
                next === 'active'
                  ? `${person.name} can trade now.`
                  : `${person.name} is on hold and cannot post or bid.`,
            },
      )
    } catch (caught) {
      setNotice({ tone: 'alert', text: describeError(caught) })
    } finally {
      setDeciding(null)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ErrorState title="Registrations didn’t load" detail={error} onRetry={reload} />
      </div>
    )
  }

  // `source` is null only before the first load lands. An empty table with
  // "0 accounts" above it is a claim about the business, not a loading state.
  if (loading && source === null) {
    return (
      <div
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
        role="status"
        aria-label="Loading registrations"
      >
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-9 w-64" />
        <Skeleton className="mt-8 h-24" />
        <Skeleton className="mt-6 h-11" />
        <div className="mt-4 grid gap-px">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-none" />
          ))}
        </div>
      </div>
    )
  }

  const queue = awaitingVerification.slice(0, QUEUE_SHOWN)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={`${number(peopleSummary.total)} accounts`}
        title="Registrations"
        description="Newest first. Search by name, account number or the digits you can see of a phone."
        actions={
          <Button
            variant="secondary"
            icon="clock"
            onClick={() => setParams({ state: 'pending', sort: 'waiting' }, { replace: true })}
          >
            Work the ID queue
          </Button>
        }
      />

      {/* The queue that actually blocks people from trading, at the top — and
          worked from here, because sending an operator to a filtered table to do
          the one thing this page exists for is a step that buys nothing. */}
      {awaitingVerification.length > 0 ? (
        <section className="mt-6 rounded-panel border border-rule bg-warn-wash/60 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Icon name="clock" className="text-base text-warn-fg" />
              {awaitingVerification.length} waiting on an ID check
            </h2>
            <p className="text-xs text-fg-2">
              Longest wait: {timeAgo(awaitingVerification[0].joinedAt).toLowerCase()} ·{' '}
              {awaitingVerification[0].name}
            </p>
          </div>
          <p className="mt-1.5 text-sm text-fg-2">
            None of these accounts can post a lot or place a bid until someone confirms their ID.
          </p>

          <ul className="mt-3 grid gap-px overflow-hidden rounded-field border border-rule bg-rule">
            {queue.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-surface-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{person.name}</p>
                  <p className="mt-0.5 text-xs text-fg-3">
                    {person.accountNo} · {ROLES[person.role].label} · {person.county} ·{' '}
                    {CHANNELS[person.channel].label} · waiting{' '}
                    {timeAgo(person.joinedAt).toLowerCase()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    icon="check"
                    loading={deciding === person.id}
                    disabled={Boolean(deciding)}
                    onClick={() => decide(person, 'active', 'ID confirmed from the queue')}
                  >
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(deciding)}
                    onClick={() => decide(person, 'limited', 'ID could not be confirmed')}
                  >
                    Hold
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {awaitingVerification.length > queue.length ? (
            <p className="mt-2.5 text-xs text-fg-2">
              <button
                type="button"
                className="font-semibold text-brand hover:underline"
                onClick={() => setParams({ state: 'pending', sort: 'waiting' }, { replace: true })}
              >
                Show the other {awaitingVerification.length - queue.length}
              </button>{' '}
              in the table below.
            </p>
          ) : null}

          {notice ? (
            <p
              className={
                notice.tone === 'alert'
                  ? 'mt-3 flex items-start gap-2 rounded-field border border-alert/40 bg-alert-wash px-3 py-2 text-sm text-alert-fg'
                  : notice.tone === 'warn'
                    ? 'mt-3 flex items-start gap-2 rounded-field border border-rule bg-surface-3 px-3 py-2 text-sm text-warn-fg'
                    : 'mt-3 flex items-start gap-2 rounded-field bg-brand-wash px-3 py-2 text-sm text-brand'
              }
              role="status"
            >
              <Icon
                name={notice.tone === 'brand' ? 'check' : 'info'}
                className="mt-0.5 shrink-0 text-base"
              />
              {notice.text}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Filters in one row above the results. */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="grid min-w-[12rem] flex-1 gap-1.5 sm:max-w-64">
          <span className="eyebrow text-fg-3">Search</span>
          <Input
            type="search"
            value={filters.q}
            placeholder="Name, u-1180, 0722…"
            onChange={(event) => setFilter('q', event.target.value)}
          />
        </label>

        <label className="grid min-w-[8rem] flex-1 gap-1.5 sm:max-w-36">
          <span className="eyebrow text-fg-3">Role</span>
          <Select value={filters.role} onChange={(event) => setFilter('role', event.target.value)}>
            <option value="">Everyone</option>
            {Object.entries(ROLES).map(([id, role]) => (
              <option key={id} value={id}>
                {role.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-40">
          <span className="eyebrow text-fg-3">State</span>
          <Select value={filters.state} onChange={(event) => setFilter('state', event.target.value)}>
            <option value="">Any state</option>
            {Object.entries(STATES).map(([id, state]) => (
              <option key={id} value={id}>
                {state.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-40">
          <span className="eyebrow text-fg-3">County</span>
          <Select
            value={filters.county}
            onChange={(event) => setFilter('county', event.target.value)}
          >
            <option value="">Anywhere</option>
            {COUNTIES.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid min-w-[8rem] flex-1 gap-1.5 sm:max-w-36">
          <span className="eyebrow text-fg-3">Signed up on</span>
          <Select
            value={filters.channel}
            onChange={(event) => setFilter('channel', event.target.value)}
          >
            <option value="">Any device</option>
            {Object.entries(CHANNELS).map(([id, channel]) => (
              <option key={id} value={id}>
                {channel.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-40">
          <span className="eyebrow text-fg-3">Sort</span>
          <Select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
            {Object.entries(SORTS).map(([id, sort]) => (
              <option key={id} value={id}>
                {sort.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <p className="text-sm text-fg-2">
          <span className="tnum font-mono font-semibold text-fg">{results.length}</span>{' '}
          {results.length === 1 ? 'account' : 'accounts'}
          {results.length !== peopleSummary.total ? ` of ${peopleSummary.total}` : null}
        </p>
        {active.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            icon="close"
            onClick={() => setParams({}, { replace: true })}
          >
            Clear {active.length} {active.length === 1 ? 'filter' : 'filters'}
          </Button>
        ) : null}
      </div>

      {results.length === 0 ? (
        // Two different empty rooms. Filters that match nothing offer a way out;
        // a project with nobody in it yet is not a mistake the operator can undo.
        active.length > 0 ? (
          <EmptyState
            className="mt-6"
            icon="user"
            title="No accounts match that"
            body="Nothing registered under those filters. Widen the county or clear the search."
            action={{ label: 'Clear filters', onClick: () => setParams({}, { replace: true }) }}
          />
        ) : (
          <EmptyState
            className="mt-6"
            icon="user"
            title="Nobody has registered yet"
            body="The first account appears here the moment someone signs up on the web, the app or the USSD shortcode."
          />
        )
      ) : (
        <Table caption="Registered accounts" className="mt-2" minWidth="58rem">
          <Head>
            <Th>Account</Th>
            <Th>Phone</Th>
            <Th>Role</Th>
            <Th>County</Th>
            <Th>Registered</Th>
            <Th>State</Th>
            <Th numeric>Deals</Th>
            <Th numeric>Value</Th>
          </Head>
          <tbody>
            {results.map((person) => {
              const state = STATES[person.state]
              const channel = CHANNELS[person.channel]

              return (
                <Row key={person.id}>
                  <Td>
                    <span className="font-semibold text-fg">{person.name}</span>
                    <span className="mt-0.5 block text-xs text-fg-3">
                      {person.accountNo} · {channel.label}
                    </span>
                  </Td>
                  <Td className="tnum font-mono text-xs whitespace-nowrap">
                    {person.phoneMasked}
                  </Td>
                  <Td>{ROLES[person.role].label}</Td>
                  <Td className="whitespace-nowrap">{person.county}</Td>
                  <Td className="whitespace-nowrap">
                    {timeAgo(person.joinedAt)}
                    <span className="mt-0.5 block text-xs text-fg-3">
                      {longDate(person.joinedAt)}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </Td>
                  <Td numeric>{person.deals}</Td>
                  <Td numeric className="whitespace-nowrap">
                    {person.gmv === 0 ? (
                      <span className="text-fg-3">—</span>
                    ) : person.gmv >= 1_000_000 ? (
                      moneyCompact(person.gmv)
                    ) : (
                      money(person.gmv)
                    )}
                  </Td>
                </Row>
              )
            })}
          </tbody>
        </Table>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-fg-3">
        <Icon name="shield" className="mt-px shrink-0 text-sm" />
        Full phone numbers never leave Postgres — they are masked before they reach this page. Even
        so, a screenshot of this table travels further than you expect.
      </p>

      <p className="mt-2 text-xs text-fg-3">
        Legend:{' '}
        {Object.entries(STATES)
          .map(([, state]) => `${state.label} — ${state.note}`)
          .join(' · ')}
      </p>

      <p className="mt-2 text-xs text-fg-3">
        <Link to="/admin" className="font-medium text-brand hover:underline">
          Back to overview
        </Link>
      </p>
    </div>
  )
}
