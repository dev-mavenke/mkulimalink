import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/Icon'

const VARIANTS = {
  /** The one action on a screen that moves money or produce. */
  primary:
    'bg-brand text-brand-fg hover:bg-brand-hover active:translate-y-px shadow-panel disabled:bg-fg-3',
  /** Everything else that is still an action. */
  secondary:
    'bg-surface-3 text-fg border border-rule-strong hover:border-fg-3 hover:bg-surface-2 active:translate-y-px',
  /** Reads as text until you need it. */
  ghost: 'text-fg-2 hover:text-fg hover:bg-surface-2',
  /** Sits on the dark board, where the light surfaces would disappear. */
  board: 'bg-board-3 text-board-fg hover:bg-board-2 border border-board-3 active:translate-y-px',
  /** Destructive — only for cancelling a lot or leaving the platform. */
  danger: 'bg-down text-down-fg hover:brightness-110 active:translate-y-px',
}

const SIZES = {
  sm: 'h-9 px-3 text-[0.8125rem] gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-[3.25rem] px-6 text-[0.9375rem] gap-2.5',
}

/**
 * Renders a `<button>`, or an `<a>`/`<Link>` when given `href`/`to` — so a
 * navigation that looks like a button is still a link, and still opens in a new
 * tab on middle click.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  fullWidth = false,
  className,
  children,
  to,
  href,
  ...rest
}) {
  const Element = to ? Link : href ? 'a' : 'button'
  const disabled = rest.disabled || loading

  return (
    <Element
      {...(to ? { to } : null)}
      {...(href ? { href } : null)}
      {...(Element === 'button' ? { type: rest.type ?? 'button' } : null)}
      {...rest}
      disabled={Element === 'button' ? disabled : undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-field font-semibold whitespace-nowrap',
        'transition-[background-color,border-color,color,transform,filter] duration-150',
        'disabled:pointer-events-none disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? (
        <Icon name="spinner" className="animate-spin text-[1.15em]" />
      ) : icon ? (
        <Icon name={icon} className="text-[1.15em]" />
      ) : null}
      {children}
      {iconAfter && !loading ? <Icon name={iconAfter} className="text-[1.15em]" /> : null}
    </Element>
  )
}
