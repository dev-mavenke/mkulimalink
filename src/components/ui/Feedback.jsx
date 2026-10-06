import { cn } from '@/lib/cn'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/Button'

export function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse rounded-field bg-surface-2', className)}
      aria-hidden="true"
    />
  )
}

/** Placeholder for the market grid while the first page of lots resolves. */
export function ListingSkeleton() {
  return (
    <div className="panel grid gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  )
}

/**
 * An empty screen is an invitation to act, so this always takes an action —
 * never just a shrug and a grey illustration.
 */
export function EmptyState({ icon = 'search', title, body, action, className }) {
  const { label, ...actionProps } = action ?? {}

  return (
    <div className={cn('panel grid justify-items-center gap-3 px-6 py-14 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-fg-3">
        <Icon name={icon} className="text-xl" />
      </span>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {body ? <p className="max-w-sm text-sm text-fg-2">{body}</p> : null}
      {action ? (
        <Button variant="secondary" size="sm" className="mt-1" {...actionProps}>
          {label}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * A load that did not come back.
 *
 * The message from Postgres or the network goes on the page verbatim, because
 * "something went wrong" tells an operator nothing they can act on. No apology
 * either — what happened and what to do about it, in that order.
 */
export function ErrorState({ title = 'This didn’t load', detail, onRetry, className }) {
  return (
    <div
      className={cn(
        'panel grid justify-items-center gap-3 border-alert/40 bg-alert-wash px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <span className="grid size-11 place-items-center rounded-full bg-alert/15 text-alert">
        <Icon name="info" className="text-xl" />
      </span>
      <h3 className="text-base font-semibold text-alert-fg">{title}</h3>
      {detail ? <p className="max-w-md text-sm text-alert-fg/90">{detail}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-1" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
