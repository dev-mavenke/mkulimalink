import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { money, number, percent, timeAgo, weight } from '@/lib/format'
import { gradeById } from '@/data/catalog'
import { useMarket } from '@/context/marketContext'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'

/**
 * One open lot.
 *
 * A buyer scans these to answer three questions in order: what is it, how much
 * of it, and where from. The card is laid out in that order, and the asking
 * price is set against today's board so nobody has to hold two numbers in their
 * head.
 */
export function ListingCard({ listing, className }) {
  const { boardRowFor } = useMarket()
  const grade = gradeById(listing.grade)
  const board = boardRowFor(listing.crop)
  const vsBoard = board ? Math.round(((listing.price - board.price) / board.price) * 1000) / 10 : null

  return (
    <article
      className={cn(
        'panel group relative grid gap-3 p-4 transition-[border-color,box-shadow] duration-150',
        'hover:border-rule-strong hover:shadow-lift focus-within:border-brand',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[0.9375rem] font-semibold text-fg">
            <Link to={`/market/${listing.id}`} className="outline-none">
              {/* Stretched link: the whole card is the hit target, but the
                  accessible name stays on the heading. */}
              <span className="absolute inset-0 rounded-panel" aria-hidden="true" />
              {listing.cropName}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-fg-3">
            <Icon name="pin" className="text-[1.1em] shrink-0" />
            {listing.ward}, {listing.county}
          </p>
        </div>
        <Badge tone="grade">{grade.label}</Badge>
      </header>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="tnum font-mono text-xl font-semibold text-fg">{money(listing.price)}</p>
          <p className="eyebrow mt-1 text-fg-3">per {listing.unit.short}</p>
        </div>
        <div className="text-right">
          <p className="tnum font-mono text-sm font-medium text-fg-2">
            {number(listing.quantity)} × {listing.unit.short}
          </p>
          <p className="eyebrow mt-1 text-fg-3">{weight(listing.totalKg)} total</p>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-rule pt-3 text-xs text-fg-3">
        <span className="flex items-center gap-1">
          <Icon name="clock" className="text-[1.15em]" />
          {timeAgo(listing.postedAt)}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="truck" className="text-[1.15em]" />
          {listing.readyIn === 0 ? 'Ready now' : `Ready in ${listing.readyIn} d`}
        </span>
        {vsBoard === null ? null : (
          <span
            className={cn(
              'tnum ml-auto font-mono font-medium',
              vsBoard <= 0 ? 'text-up' : 'text-fg-3',
            )}
          >
            {vsBoard === 0 ? 'At board' : `${percent(vsBoard)} vs board`}
          </span>
        )}
      </footer>
    </article>
  )
}
