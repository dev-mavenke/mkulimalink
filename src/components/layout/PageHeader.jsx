import { cn } from '@/lib/cn'

/** The heading block every in-app screen opens with. */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-rule pb-6',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow text-fg-3">{eyebrow}</p> : null}
        <h1 className="masthead mt-2 text-[1.75rem] text-fg sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-prose text-sm text-fg-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** A number that is the point of its own tile. */
export function Stat({ label, value, sub, className }) {
  return (
    <div className={cn('panel p-4', className)}>
      <p className="eyebrow text-fg-3">{label}</p>
      <p className="tnum mt-2 font-mono text-2xl font-semibold text-fg">{value}</p>
      {sub ? <p className="mt-1 text-xs text-fg-3">{sub}</p> : null}
    </div>
  )
}
