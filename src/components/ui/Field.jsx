import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/Icon'

/**
 * Label, control, hint and error as one unit, wired together by a generated id
 * so the association is never left to a hand-typed `htmlFor`.
 *
 * `children` receives the props the control needs: `{ id, 'aria-describedby',
 * 'aria-invalid' }`.
 */
export function Field({ label, hint, error, required, className, children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-[0.8125rem] font-semibold text-fg">
        {label}
        {required ? null : <span className="ml-1.5 font-normal text-fg-3">optional</span>}
      </label>

      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-fg-3">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs font-medium text-down">
          <Icon name="info" className="text-[1.15em] shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function Input({ className, ...rest }) {
  return <input className={cn('field-base', className)} {...rest} />
}

export function Textarea({ className, rows = 3, ...rest }) {
  return <textarea rows={rows} className={cn('field-base resize-y', className)} {...rest} />
}

export function Select({ className, children, ...rest }) {
  return (
    <div className="relative">
      <select className={cn('field-base appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-3"
      />
    </div>
  )
}

/** A number input with its unit sitting inside the field, where a form would print it. */
export function AmountInput({ suffix, className, ...rest }) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        className={cn('field-base tnum pr-16 font-mono', className)}
        {...rest}
      />
      <span className="eyebrow pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-3">
        {suffix}
      </span>
    </div>
  )
}
