import { useMemo } from 'react'
import { useAuth } from '@/context/authContext'
import { useMarket } from '@/context/marketContext'
import { money, moneyCompact, number, timeAgo, weight } from '@/lib/format'
import { PageHeader, Stat } from '@/components/layout/PageHeader'
import { Badge, Delta } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { PriceTrend } from '@/components/PriceTrend'
import { Icon } from '@/components/Icon'

/** Lot lifecycle. The colour and the label always travel together. */
const STATUS = {
  open: { label: 'Taking bids', tone: 'brand' },
  bid: { label: 'Bid received', tone: 'grade' },
  collecting: { label: 'Collecting', tone: 'neutral' },
  paid: { label: 'Paid', tone: 'neutral' },
}


const MY_LOTS = [
  { listingId: 'lot-2841', status: 'bid', bids: 3, best: 5050 },
  { listingId: 'lot-2836', status: 'open', bids: 1, best: 2700 },
  { listingId: 'lot-2834', status: 'collecting', bids: 2, best: 1240 },
  { listingId: 'lot-2825', status: 'paid', bids: 4, best: 11600 },
]

export function Dashboard() {
  const { user } = useAuth()
  const { listings, boardRowFor, boardRows } = useMarket()

  const lots = useMemo(
    () =>
      MY_LOTS.map((lot) => ({
        ...lot,
        listing: listings.find((listing) => listing.id === lot.listingId),
      })).filter((lot) => lot.listing),
    [listings],
  )

  const openLots = lots.filter((lot) => lot.status !== 'paid')
  const earned = lots
    .filter((lot) => lot.status === 'paid')
    .reduce((total, lot) => total + lot.best * lot.listing.quantity, 0)
  const pending = openLots.reduce((total, lot) => total + lot.best * lot.listing.quantity, 0)

  /** The crop this farmer has most at stake in — worth a chart. */
  const watched = boardRowFor(openLots[0]?.listing.crop) ?? boardRows[0]

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Your farm"
        title={`Habari, ${firstName}`}
        description="Everything you have on the market, and what buyers are offering for it."
        actions={
          <Button to="/new" icon="plus">
            Post a harvest
          </Button>
        }
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Open lots"
          value={number(openLots.length)}
          sub={`${weight(openLots.reduce((total, lot) => total + lot.listing.totalKg, 0))} on the market`}
        />
        <Stat label="Best bids standing" value={moneyCompact(pending)} sub="Before the 6% buyer fee" />
        <Stat label="Paid this season" value={moneyCompact(earned)} sub="Settled by M-Pesa" />
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4 border-b border-rule pb-3">
          <h2 className="text-base font-semibold text-fg">Your lots</h2>
          <p className="eyebrow text-fg-3">{number(lots.length)} total</p>
        </div>

        {lots.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon="sprout"
            title="Nothing on the market yet"
            body="Post your first lot and verified buyers will see it within minutes."
            action={{ label: 'Post a harvest', to: '/new' }}
          />
        ) : (
          <ul className="mt-4 grid gap-3">
            {lots.map((lot) => {
              const status = STATUS[lot.status]
              const board = boardRowFor(lot.listing.crop)
              const total = lot.best * lot.listing.quantity

              return (
                <li key={lot.listingId} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[0.9375rem] font-semibold text-fg">
                          {lot.listing.cropName}
                        </h3>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-fg-3">
                        {number(lot.listing.quantity)} × {lot.listing.unit.short} ·{' '}
                        {weight(lot.listing.totalKg)} · posted{' '}
                        {timeAgo(lot.listing.postedAt).toLowerCase()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="tnum font-mono text-lg font-semibold text-fg">{money(total)}</p>
                      <p className="mt-0.5 text-xs text-fg-3">
                        {lot.bids} {lot.bids === 1 ? 'bid' : 'bids'} · best {money(lot.best)} per{' '}
                        {lot.listing.unit.short}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
                    {board ? (
                      <p className="flex items-center gap-1.5 text-xs text-fg-3">
                        <Icon name="board" className="text-sm" />
                        Board today {money(board.price)}
                        <Delta value={board.change} className="ml-1" />
                      </p>
                    ) : (
                      <span />
                    )}
                    {lot.status === 'bid' ? (
                      <Button size="sm" icon="check">
                        Review {lot.bids} bids
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        to={`/market/${lot.listingId}`}
                        iconAfter="arrowRight"
                      >
                        View lot
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {watched ? (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-fg">Watching</h2>
          <p className="mt-1 text-sm text-fg-2">
            You have the most riding on {watched.crop}. Here is where the board has been.
          </p>
          <div className="panel mt-4 p-5">
            <PriceTrend crop={watched.crop} history={watched.history} change={watched.change} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
