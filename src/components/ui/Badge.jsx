import { cn } from '@/lib/cn'
import { Icon } from '@/components/Icon'
import { percent } from '@/lib/format'

/**
 * Amber wash. Used for two different meanings — produce quality and a degraded
 * system — so it is named once and aliased, rather than one key quietly doing
 * both jobs.
 */
const AMBER = 'bg-warn-wash text-warn-fg border-transparent'

const TONES = {
  neutral: 'bg-surface-2 text-fg-2 border-rule',
  brand: 'bg-brand-wash text-brand border-transparent',
  grade: AMBER,
  warning: AMBER,
  alert: 'bg-alert-wash text-alert-fg border-transparent',
  board: 'bg-board-3 text-board-fg-2 border-transparent',
}

export function Badge({ tone = 'neutral', icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
        'text-[0.6875rem] font-semibold tracking-wide uppercase',
        TONES[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} className="text-[1.1em]" /> : null}
      {children}
    </span>
  )
}

/**
 * A price move.
 *
 * Direction is carried by an arrow *and* a sign as well as colour, and down-moves
 * use hibiscus rather than red — a magenta/green pair stays separable for the
 * ~8% of men with red-green colour blindness, which red/green does not.
 */
export function Delta({ value, className, showZero = true }) {
  if (value === 0 && !showZero) return null

  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'

  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-0.5 font-mono text-xs font-medium',
        direction === 'up' && 'text-up',
        direction === 'down' && 'text-down',
        direction === 'flat' && 'text-fg-3',
        className,
      )}
    >
      {direction === 'flat' ? (
        <span aria-hidden="true">–</span>
      ) : (
        <Icon name={direction === 'up' ? 'arrowUp' : 'arrowDown'} className="text-[1.05em]" />
      )}
      <span className="sr-only">{direction === 'up' ? 'Up' : direction === 'down' ? 'Down' : 'Unchanged'} </span>
      {direction === 'flat' ? '0.0%' : percent(value, { signed: false })}
    </span>
  )
}
