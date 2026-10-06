import { cn } from '@/lib/cn'

/**
 * The operator tables.
 *
 * Every queue on the admin side is the same object: a dense ruled grid where
 * figures line up in a column and the row is the unit of work. Defined once here
 * so the four pages cannot drift apart, and so the horizontal scroll on a narrow
 * screen behaves the same way everywhere — an operator table is allowed to be
 * wider than a phone rather than folding into unreadable stacks.
 */
export function Table({ caption, minWidth = '48rem', className, children }) {
  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <table className="w-full border-collapse text-left align-middle" style={{ minWidth }}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export function Head({ children }) {
  return (
    <thead>
      <tr className="border-b border-rule-strong">{children}</tr>
    </thead>
  )
}

export function Th({ numeric, className, children, ...rest }) {
  return (
    <th
      scope="col"
      className={cn(
        'eyebrow pb-2 text-fg-3 whitespace-nowrap',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export function Row({ className, children, ...rest }) {
  return (
    <tr
      className={cn('border-b border-rule last:border-0 hover:bg-surface-2/70', className)}
      {...rest}
    >
      {children}
    </tr>
  )
}

export function Td({ numeric, className, children, ...rest }) {
  return (
    <td
      className={cn(
        'py-2.5 pr-4 text-sm text-fg-2 last:pr-0',
        numeric && 'tnum text-right font-mono text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  )
}
