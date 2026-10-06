const KES_COMPACT = new Intl.NumberFormat('en-KE', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const PLAIN = new Intl.NumberFormat('en-KE')

const DAY = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' })
const DAY_FULL = new Intl.DateTimeFormat('en-KE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const MONTH = new Intl.DateTimeFormat('en-KE', { month: 'long' })

/** What every formatter here prints for a value that is not there. */
const MISSING = '–'

/**
 * `KSh 1,850` — the way a price is quoted at the market.
 *
 * Assembled by hand rather than with `style: 'currency'`, because engines
 * disagree on whether KES renders as "KES", "KSh" or "Ksh", and on whether the
 * separator is a normal or a non-breaking space. These numbers sit in columns,
 * so that has to be stable.
 */
export function money(value) {
  return `KSh ${PLAIN.format(Math.round(value))}`
}

/** `KSh 4.2M` for figures too long to sit in a stat tile. */
export function moneyCompact(value) {
  return `KSh ${KES_COMPACT.format(value)}`
}

export function number(value) {
  return PLAIN.format(value)
}

/** `+8.4%` / `−3.1%` — a true minus sign, not a hyphen. */
export function percent(value, { signed = true } = {}) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  const body = `${Math.abs(value).toFixed(1)}%`
  return signed ? `${sign}${body}` : body
}

export function shortDate(value) {
  const date = toDate(value)
  return date ? DAY.format(date) : MISSING
}

export function longDate(value) {
  const date = toDate(value)
  return date ? DAY_FULL.format(date) : MISSING
}

/** `August` — for copy that names the month it is currently reporting on. */
export function monthName(value = new Date()) {
  const date = toDate(value)
  return date ? MONTH.format(date) : MISSING
}

/** `2 h ago`, `Yesterday`, `4 Aug` — how fresh is this listing? */
export function timeAgo(value, now = new Date()) {
  const then = toDate(value)
  if (!then) return MISSING
  const minutes = Math.round((now - then) / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'Yesterday'

  const days = Math.round(hours / 24)
  if (days < 7) return `${days} days ago`
  return shortDate(then)
}

/** `1.2 t` once a quantity outgrows kilos. */
export function weight(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 1)} t`
  return `${number(kg)} kg`
}

/**
 * How a lot is named to a person: `#2841`.
 *
 * A lot id is `lot-` plus a sequence number in both sources, because a number
 * read out over a phone at the loading bay has to be short enough to say. The
 * slice is a fallback for an id in some other shape, and the en dash is for a
 * settlement whose lot has since been taken down — `listing_id` is nullable.
 */
export function lotRef(id) {
  if (!id) return MISSING
  return id.startsWith('lot-') ? `#${id.slice(4)}` : `#${id.slice(0, 8)}`
}

/**
 * `new Date(null)` is the epoch, so an unguarded formatter renders a missing
 * timestamp as `Thursday, 1 January 1970` — a plausible-looking date for a
 * value that does not exist. An en dash is unmistakably nothing.
 */
function toDate(value) {
  if (value === null || value === undefined) return null
  return value instanceof Date ? value : new Date(value)
}
