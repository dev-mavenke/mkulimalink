/**
 * A curated icon set — only the glyphs this product actually uses, drawn on a
 * 24px grid with a 1.6px stroke so they sit at a consistent weight next to
 * Public Sans. Inline SVG rather than an icon font: no extra network request,
 * no flash of missing glyphs on a slow connection.
 */
import { cn } from '@/lib/cn'

const BASE = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

const PATHS = {
  board: (
    <>
      <path d="M3 4h18v13H3z" />
      <path d="M7 21h10M12 17v4M7 9h4M7 12.5h6M15 8.5l2.5 2.5" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-3.9 2.8-6.7 6.7-6.7 0 3.9-2.8 6.7-6.7 6.7Z" />
      <path d="M12 15.5c0-2.9-2.1-5-5-5 0 2.9 2.1 5 5 5Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.7-4.7" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18M7 21h10" />
      <path d="M4 8h16M8 8l-4 6h8L8 8ZM16 8l-4 6h8l-4-6Z" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5Z" />
      <path d="M21 10.5h-4.5a1.5 1.5 0 0 0 0 3H21z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrowRight: <path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5" />,
  arrowUp: <path d="M12 19V5m-6 6 6-6 6 6" />,
  arrowDown: <path d="M12 5v14m6-6-6 6-6-6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  star: (
    <path d="M12 3.6l2.6 5.5 5.9.8-4.3 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.5 9.9l5.9-.8z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5m0-14.2-1.5 1.5M6.4 17.6l-1.5 1.5" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.75v.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.5 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 21s7-3.2 7-9V5.5L12 3 5 5.5V12c0 5.8 7 9 7 9Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  spinner: <path d="M12 3a9 9 0 1 0 9 9" />,
}

export function Icon({ name, className, title, ...rest }) {
  const path = PATHS[name]
  if (!path) {
    if (import.meta.env.DEV) console.warn(`[Icon] no glyph named "${name}"`)
    return null
  }

  return (
    <svg
      {...BASE}
      {...(title ? { 'aria-hidden': undefined, role: 'img' } : null)}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  )
}

/** The wordmark: a sprout struck through by the board's baseline rule. */
export function Logo({ className, showText = true, tone = 'default' }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="7" className={tone === 'board' ? 'fill-board-2' : 'fill-board'} />
        <path
          d="M16 26V13"
          className="stroke-leaf-bright"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M16 15c0-4.4 3.1-7.5 7.5-7.5 0 4.4-3.1 7.5-7.5 7.5Z" className="fill-leaf-bright" />
        <path d="M8 29h16" className="stroke-marigold" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {showText ? (
        <span
          className={cn(
            'masthead text-[1.0625rem] tracking-[-0.01em]',
            tone === 'board' ? 'text-board-fg' : 'text-fg',
          )}
        >
          Mkulima
          <span className={tone === 'board' ? 'text-leaf-bright' : 'text-brand'}>Link</span>
        </span>
      ) : (
        <span className="sr-only">MkulimaLink</span>
      )}
    </span>
  )
}
