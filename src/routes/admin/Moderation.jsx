import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SEVERITIES } from '@/data/ops'
import { useAdmin } from '@/context/adminContext'
import { describeError } from '@/lib/supabase'
import { lotRef, money, number, percent, timeAgo, weight } from '@/lib/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/Icon'

/**
 * Lots a rule pulled out of the market.
 *
 * Cards rather than a table: each one is a decision with a paragraph of context
 * behind it, and a row of cells cannot hold the reasoning an operator needs
 * before stopping someone's harvest from trading.
 *
 * Both decisions go to Postgres through a `security definer` function that writes
 * to `admin_actions` on the way past, and the provider re-reads afterwards — so
 * the card leaving the page is evidence the write landed, not an optimistic
 * animation.
 */
export function AdminModeration() {
  const { moderationQueue, resolveFlag, stopListing, source, loading, error, reload } = useAdmin()

  /** The flag mid-write, so only its own buttons wait. */
  const [deciding, setDeciding] = useState(null)
  const [notice, setNotice] = useState(null)

  const act = async (flag, write, spoken) => {
    setDeciding(flag.id)
    setNotice(null)
    try {
      const result = await write()
      if (result.local) {
        setNotice({
          tone: 'warn',
          text: `No project is connected, so ${lotRef(flag.listing.id)} was not changed.`,
        })
      } else {
        setNotice({ tone: 'brand', text: spoken })
      }
    } catch (caught) {
      setNotice({ tone: 'alert', text: describeError(caught) })
    } finally {
      setDeciding(null)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <ErrorState title="The queue didn’t load" detail={error} onRetry={reload} />
      </div>
    )
  }

  // An empty queue and an unfinished query look identical once rendered, and one
  // of them tells an operator there is nothing to check this morning.
  if (loading && source === null) {
    return (
      <div
        className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10"
        role="status"
        aria-label="Loading the flag queue"
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-9 w-56" />
        <div className="mt-8 grid gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      </div>
    )
  }

  const stopped = moderationQueue.filter((flag) => flag.severity === 'urgent').length

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={`${number(moderationQueue.length)} in the queue`}
        title="Flagged lots"
        description="Worked top to bottom: lots that are already stopped come first, then whichever has been waiting longest."
        actions={
          <Button to="/market" variant="secondary" iconAfter="arrowRight">
            Open market
          </Button>
        }
      />

      {notice ? (
        <p
          className={
            notice.tone === 'alert'
              ? 'mt-5 flex items-start gap-2 rounded-field border border-alert/40 bg-alert-wash px-3 py-2.5 text-sm text-alert-fg'
              : notice.tone === 'warn'
                ? 'mt-5 flex items-start gap-2 rounded-field border border-rule bg-warn-wash/60 px-3 py-2.5 text-sm text-warn-fg'
                : 'mt-5 flex items-start gap-2 rounded-field bg-brand-wash px-3 py-2.5 text-sm text-brand'
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

      {moderationQueue.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon="check"
          title="Queue is clear"
          body="Nothing is waiting on a decision. New flags appear here within a minute of a rule firing."
          action={{ label: 'Back to overview', to: '/admin' }}
        />
      ) : (
        <>
          <p className="mt-6 border-b border-rule pb-3 text-sm text-fg-2">
            <span className="tnum font-mono font-semibold text-fg">{stopped}</span> of{' '}
            <span className="tnum font-mono">{moderationQueue.length}</span> are stopped from trading
            right now.
          </p>

          <ul className="mt-4 grid gap-3">
            {moderationQueue.map((flag) => {
              const severity = SEVERITIES[flag.severity]
              const { listing, board } = flag
              const busy = deciding === flag.id

              return (
                <li key={flag.id} className="panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={severity.tone}>{severity.label}</Badge>
                        <span className="eyebrow text-fg-3">{flag.rule}</span>
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-fg">
                        <Link to={`/market/${listing.id}`} className="hover:underline">
                          {listing.cropName}
                        </Link>
                        <span className="ml-2 font-normal text-fg-3">{lotRef(listing.id)}</span>
                      </h2>
                      <p className="mt-1 text-xs text-fg-3">
                        {listing.farmer.name} · {listing.ward}, {listing.county} · flagged{' '}
                        {timeAgo(flag.raisedAt).toLowerCase()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="tnum font-mono text-lg font-semibold text-fg">
                        {money(listing.price)}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-3">per {listing.unit.short}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-fg-2">{flag.detail}</p>

                  {/* The numbers the rule was measuring, so the operator can check it. */}
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-rule pt-3 sm:grid-cols-4">
                    <div>
                      <dt className="eyebrow text-fg-3">Board today</dt>
                      <dd className="tnum mt-1 font-mono text-sm text-fg">
                        {/* A crop with no board row today is not a zero. The rule
                            that fired did not measure against one either. */}
                        {board ? money(board.price) : <span className="text-fg-3">Not posted</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-fg-3">Asking vs board</dt>
                      <dd className="tnum mt-1 font-mono text-sm text-fg">
                        {flag.vsBoard === null ? (
                          <span className="text-fg-3">—</span>
                        ) : flag.vsBoard === 0 ? (
                          'At board'
                        ) : (
                          percent(flag.vsBoard)
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-fg-3">Lot size</dt>
                      <dd className="tnum mt-1 font-mono text-sm text-fg">
                        {weight(listing.totalKg)}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-fg-3">Farmer record</dt>
                      <dd className="tnum mt-1 font-mono text-sm text-fg">
                        {listing.farmer.lots} lots
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      icon="check"
                      loading={busy}
                      disabled={Boolean(deciding)}
                      onClick={() =>
                        act(
                          flag,
                          () => resolveFlag(flag.id, 'Checked and cleared'),
                          `${lotRef(listing.id)} is back in the market.`,
                        )
                      }
                    >
                      Clear the flag
                    </Button>
                    {flag.severity === 'review' ? (
                      <Button
                        size="sm"
                        variant="danger"
                        icon="close"
                        disabled={Boolean(deciding)}
                        onClick={() =>
                          act(
                            flag,
                            () => stopListing(flag.id, flag.rule),
                            `${lotRef(listing.id)} has stopped trading. The farmer is told why.`,
                          )
                        }
                      >
                        Stop it trading
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      to={`/market/${listing.id}`}
                      iconAfter="arrowRight"
                    >
                      See what buyers see
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
