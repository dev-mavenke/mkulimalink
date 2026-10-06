import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { longDate, money, percent } from '@/lib/format'
import { useMarket } from '@/context/marketContext'
import { Delta } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/Icon'

/**
 * Today's board — the signature element.
 *
 * Every wholesale market in Kenya posts a board: crop, unit, today's price. It
 * is the artefact the whole trade orients around and the reason a farmer opens
 * this app in the morning, so it is the hero rather than a photograph of a
 * field. It stays dark in both themes because a board is a physical object.
 *
 * Two prices per row, always: what MkulimaLink pays and what the broker at the
 * gate offers. The second number is the one the farmer already knows, which is
 * what makes the first one mean anything.
 */

/**
 * The chrome, so the three states share one definition of the frame.
 *
 * The failure and waiting states are written in board tones by hand rather than
 * dropped in from `Feedback.jsx`: the board re-points its ink but not the alert
 * palette, so a shared error panel would paint a pale wash into the one dark
 * surface on the page.
 */
function BoardShell({ className, heading, note, children }) {
  return (
    <section className={cn('board-panel overflow-hidden', className)} aria-labelledby="board-heading">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-board-3 px-4 py-3.5 sm:px-5">
        <div>
          <p className="eyebrow text-marigold">Today’s board</p>
          <h2 id="board-heading" className="mt-1.5 text-sm font-semibold text-board-fg">
            {heading}
          </h2>
        </div>
        <p className="text-xs text-board-fg-3">{note}</p>
      </header>
      {children}
    </section>
  )
}

const RATE_NOTE = 'Farm-gate, per unit · Buyer pays 6% fee'

export function PriceBoard({ limit, className, animate = true }) {
  const { boardRows, boardDate, boardSummary, loading, error, reload } = useMarket()
  const [expanded, setExpanded] = useState(false)

  if (error) {
    return (
      <BoardShell className={className} heading="Prices are unavailable" note={RATE_NOTE}>
        <div className="grid justify-items-start gap-3 px-4 py-8 sm:px-5">
          <p className="max-w-md text-sm text-board-fg-2">{error}</p>
          <p className="text-xs text-board-fg-3">
            Nothing has changed at the gate — this is the app’s connection, not the market.
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-1 inline-flex items-center gap-1 rounded-field border border-board-3 px-3 py-1.5 text-xs font-semibold text-board-fg hover:border-marigold hover:text-marigold"
          >
            Load the board again
          </button>
        </div>
      </BoardShell>
    )
  }

  if (loading && boardRows.length === 0) {
    return (
      <BoardShell className={className} heading="Reading today’s prices…" note={RATE_NOTE}>
        <div className="grid gap-3 px-4 py-5 sm:px-5" role="status" aria-label="Loading prices">
          {Array.from({ length: limit ?? 6 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-28 bg-board-2" />
              <Skeleton className="h-4 w-16 bg-board-2" />
            </div>
          ))}
        </div>
      </BoardShell>
    )
  }

  // An empty board is a real state, not an error: the day's rates are published
  // once each morning, and before that there is genuinely nothing to post.
  if (boardRows.length === 0) {
    return (
      <BoardShell className={className} heading="Not posted yet" note={RATE_NOTE}>
        <p className="px-4 py-8 text-sm text-board-fg-2 sm:px-5">
          Today’s rates go up each morning once the reference markets report.
        </p>
      </BoardShell>
    )
  }

  const visible = expanded || !limit ? boardRows : boardRows.slice(0, limit)
  const hidden = boardRows.length - visible.length

  return (
    <BoardShell className={className} heading={longDate(boardDate)} note={RATE_NOTE}>
      <table className="w-full text-left">
        <caption className="sr-only">
          Crop prices for {longDate(boardDate)}, comparing the MkulimaLink farm-gate price with the
          going broker offer.
        </caption>
        <thead>
          <tr className="eyebrow text-board-fg-3">
            <th scope="col" className="py-2.5 pl-4 font-medium sm:pl-5">
              Crop
            </th>
            <th scope="col" className="hidden py-2.5 text-right font-medium sm:table-cell">
              Broker
            </th>
            <th scope="col" className="py-2.5 text-right font-medium">
              You get
            </th>
            <th scope="col" className="py-2.5 pr-4 text-right font-medium sm:pr-5">
              <span className="sm:hidden">24 h</span>
              <span className="hidden sm:inline">vs. yesterday</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => (
            <tr
              key={row.id}
              className={cn(
                'border-t border-board-2/80 transition-colors hover:bg-board-2/60',
                animate && 'animate-row-in',
              )}
              style={animate ? { animationDelay: `${Math.min(index, 12) * 45}ms` } : undefined}
            >
              <th scope="row" className="py-2.5 pl-4 font-normal sm:pl-5">
                <Link
                  to={`/market?crop=${row.id}`}
                  className="group inline-flex items-baseline gap-2 rounded-sm"
                >
                  <span className="text-sm font-semibold text-board-fg group-hover:text-marigold">
                    {row.crop}
                  </span>
                  <span className="eyebrow text-board-fg-3">{row.unit}</span>
                </Link>
              </th>

              <td className="hidden py-2.5 text-right sm:table-cell">
                <span className="tnum font-mono text-[0.8125rem] text-board-fg-3 line-through decoration-board-fg-3/50">
                  {money(row.broker)}
                </span>
              </td>

              <td className="py-2.5 text-right">
                <span className="tnum font-mono text-[0.9375rem] font-semibold text-marigold">
                  {money(row.price)}
                </span>
                <span className="block text-[0.6875rem] text-board-fg-3 sm:hidden">
                  {percent(row.uplift)} on broker
                </span>
              </td>

              <td className="py-2.5 pr-4 text-right sm:pr-5">
                <Delta value={row.change} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="rule-total flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-board-2/60 px-4 py-3 sm:px-5">
        <p className="text-xs text-board-fg-2">
          <span className="tnum font-mono font-semibold text-marigold">
            {percent(boardSummary.averageUplift)}
          </span>{' '}
          average lift on the broker rate, across all {boardRows.length} crops.
        </p>

        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-board-fg hover:text-marigold"
          >
            Show {hidden} more
            <Icon name="chevronDown" className="text-sm" />
          </button>
        ) : (
          <Link
            to="/market"
            className="inline-flex items-center gap-1 text-xs font-semibold text-board-fg hover:text-marigold"
          >
            Browse open lots
            <Icon name="arrowRight" className="text-sm" />
          </Link>
        )}
      </footer>
    </BoardShell>
  )
}
