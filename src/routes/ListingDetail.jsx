import { Link, useParams } from 'react-router-dom'
import { useMarket } from '@/context/marketContext'
import { gradeById } from '@/data/catalog'
import { longDate, lotRef, money, number, percent, timeAgo, weight } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { PriceTrend } from '@/components/PriceTrend'
import { Icon } from '@/components/Icon'

/**
 * One lot, in enough detail to commit money to it.
 *
 * The spec block is set as a ruled grid, the way the carbon-copy delivery notes
 * that travel with a load are printed — every field in its own box, nothing
 * implied.
 */
export function ListingDetail() {
  const { id } = useParams()
  const { listingById, boardRowFor, loading, error, reload } = useMarket()
  const listing = listingById(id)

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <ErrorState title="This lot didn’t load" detail={error} onRetry={reload} />
      </div>
    )
  }

  // "No longer open" is a real answer, but only once the lots are actually in.
  // Saying it while the fetch is still running would turn every slow connection
  // into a sold lot.
  if (loading && !listing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6" role="status" aria-label="Loading lot">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-6 h-11 w-2/3" />
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-8 h-28 w-full" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <EmptyState
          icon="board"
          title="That lot is no longer open"
          body="Lots come off the market as soon as a buyer confirms. There may be something similar posted today."
          action={{ label: 'Back to the market', to: '/market' }}
        />
      </div>
    )
  }

  const grade = gradeById(listing.grade)
  const board = boardRowFor(listing.crop)
  const vsBoard = board ? Math.round(((listing.price - board.price) / board.price) * 1000) / 10 : null
  const fee = Math.round(listing.total * 0.06)

  const spec = [
    { label: 'Grade', value: grade.label, note: grade.note },
    { label: 'Unit', value: listing.unit.label, note: `${listing.unit.kg} kg per unit` },
    { label: 'Quantity', value: `${number(listing.quantity)} × ${listing.unit.short}` },
    { label: 'Net weight', value: weight(listing.totalKg) },
    { label: 'Origin', value: `${listing.ward}, ${listing.county}` },
    {
      label: 'Collection',
      value: listing.readyIn === 0 ? 'Ready now' : `${listing.readyIn} days`,
      note: listing.readyIn === 0 ? 'Loadable today' : 'From confirmation',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/market"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-2 hover:text-fg"
      >
        <Icon name="arrowRight" className="rotate-180 text-base" />
        All open lots
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="min-w-0">
          <header className="border-b border-rule pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="grade">{grade.label}</Badge>
              <Badge tone="neutral" icon="pin">
                {listing.county}
              </Badge>
              <span className="eyebrow text-fg-3">Lot {lotRef(listing.id)}</span>
            </div>

            <h1 className="masthead mt-4 text-[2.25rem] text-fg sm:text-[2.75rem]">
              {listing.cropName}
            </h1>

            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-3">
              <span className="flex items-center gap-1">
                <Icon name="clock" className="text-[1.15em]" />
                Posted {timeAgo(listing.postedAt).toLowerCase()}
              </span>
              <span className="text-rule-strong">|</span>
              <span>{longDate(listing.postedAt)}</span>
            </p>
          </header>

          <p className="mt-6 max-w-prose text-[0.9375rem] leading-relaxed text-fg-2">
            {listing.note}
          </p>

          {/* Spec: ruled boxes, like the delivery note that rides with the load. */}
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-rule bg-rule sm:grid-cols-3">
            {spec.map((item) => (
              <div key={item.label} className="bg-surface-3 px-4 py-3.5">
                <dt className="eyebrow text-fg-3">{item.label}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-fg">{item.value}</dd>
                {item.note ? <p className="mt-0.5 text-xs text-fg-3">{item.note}</p> : null}
              </div>
            ))}
          </dl>

          <section className="mt-10">
            <h2 className="text-base font-semibold text-fg">The farmer</h2>
            <div className="panel mt-3 flex flex-wrap items-center gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-board text-base font-semibold text-board-fg">
                {listing.farmer.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold text-fg">{listing.farmer.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-3">
                  {/* A farmer with no completed deliveries has no rating yet.
                      A default of 5.0 would be a review nobody wrote. */}
                  {listing.farmer.rating === null || listing.farmer.rating === undefined ? (
                    <span>First lot on MkulimaLink</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Icon name="star" className="text-[1.15em] text-marigold" />
                      <span className="tnum font-mono">{listing.farmer.rating.toFixed(1)}</span>
                    </span>
                  )}
                  <span className="text-rule-strong">|</span>
                  <span>
                    <span className="tnum font-mono">{listing.farmer.lots}</span> lots delivered
                  </span>
                  <span className="text-rule-strong">|</span>
                  <span>{listing.ward}</span>
                </p>
              </div>
              <Badge tone="brand" icon="shield">
                ID verified
              </Badge>
            </div>
          </section>

          {board ? (
            <section className="mt-10">
              <h2 className="text-base font-semibold text-fg">What {listing.cropName} has done</h2>
              <div className="panel mt-3 p-5">
                <PriceTrend crop={listing.cropName} history={board.history} change={board.change} />
              </div>
            </section>
          ) : null}
        </div>

        {/* ---- Offer panel ------------------------------------------------ */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-5">
            <p className="eyebrow text-fg-3">Asking</p>
            <p className="tnum mt-2 font-mono text-3xl font-semibold text-fg">
              {money(listing.price)}
            </p>
            <p className="mt-1 text-sm text-fg-3">per {listing.unit.short}</p>

            {vsBoard === null ? null : (
              <p className="mt-3 text-xs text-fg-2">
                {vsBoard === 0 ? (
                  'Exactly today’s board price.'
                ) : (
                  <>
                    <span
                      className={`tnum font-mono font-semibold ${vsBoard < 0 ? 'text-up' : 'text-fg'}`}
                    >
                      {percent(vsBoard)}
                    </span>{' '}
                    against today&rsquo;s board of {money(board.price)}.
                  </>
                )}
              </p>
            )}

            <dl className="mt-5 grid gap-2 border-t border-rule pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fg-2">
                  {number(listing.quantity)} × {listing.unit.short}
                </dt>
                <dd className="tnum font-mono text-fg">{money(listing.total)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fg-2">Platform fee (6%)</dt>
                <dd className="tnum font-mono text-fg">{money(fee)}</dd>
              </div>
              <div className="rule-total mt-1 flex items-baseline justify-between gap-3 pt-3">
                <dt className="font-semibold text-fg">You pay</dt>
                <dd className="tnum font-mono text-lg font-semibold text-fg">
                  {money(listing.total + fee)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-2">
              <Button size="lg" fullWidth icon="check">
                Offer the asking price
              </Button>
              <Button size="lg" variant="secondary" fullWidth>
                Bid a different price
              </Button>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-fg-3">
              <Icon name="shield" className="mt-px shrink-0 text-sm" />
              Payment is held until you and {listing.farmer.name.split(' ')[0]} both confirm the
              weight at collection.
            </p>
          </div>

          <p className="mt-4 px-1 text-xs text-fg-3">
            Transport is not included. Most buyers in {listing.county} collect with a 3&ndash;7 tonne
            pickup.
          </p>
        </aside>
      </div>
    </div>
  )
}
