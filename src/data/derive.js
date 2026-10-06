import { COUNTIES } from '@/data/catalog'

/**
 * Derivations for seed mode.
 *
 * Each function here has a counterpart in the migration — `deriveSignupsByDay`
 * mirrors `admin_signups_by_day()`, `deriveCountyBreakdown` mirrors
 * `admin_county_breakdown()`, and so on. They must agree, because the same screen
 * renders whichever one produced the numbers, and a chart that reads differently
 * depending on whether a project is attached is worse than one that only works
 * when it is.
 *
 * Where a rule is easy to get wrong, both implementations state it: zero-signup
 * days are kept, and counties with nobody in them are kept.
 */

/** Newest first — the order an operator wants when they open the page. */
export function deriveRegistrations(people) {
  return [...people].sort((a, b) => b.joinedAt - a.joinedAt)
}

/** Longest wait first: whoever signed up earliest has been blocked longest. */
export function deriveAwaitingVerification(people) {
  return people.filter((person) => person.state === 'pending').sort((a, b) => a.joinedAt - b.joinedAt)
}

/**
 * New accounts per calendar day across a window ending today. A day with no
 * signups is a zero, not a gap: dropping it would redraw a quiet week as a busy
 * one on a narrower axis.
 */
export function deriveSignupsByDay(people, span = 14) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (span - 1))

  const days = Array.from({ length: span }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { date, farmers: 0, buyers: 0, total: 0 }
  })

  for (const person of people) {
    // Kenya is UTC+3 with no daylight saving, so a plain day division is exact.
    const day = days[Math.floor((person.joinedAt - start) / 86_400_000)]
    if (!day) continue
    day[person.role === 'buyer' ? 'buyers' : 'farmers'] += 1
    day.total += 1
  }

  return days
}

export function derivePeopleSummary(people) {
  const count = (predicate) => people.filter(predicate).length
  const registrations = deriveRegistrations(people)

  return {
    total: people.length,
    farmers: count((person) => person.role === 'farmer'),
    buyers: count((person) => person.role === 'buyer'),
    awaitingId: count((person) => person.state === 'pending'),
    restricted: count((person) => person.state === 'limited' || person.state === 'suspended'),
    /** Share on feature phones — decides whether SMS fallbacks can be retired. */
    ussdShare: people.length
      ? Math.round((count((person) => person.channel === 'ussd') / people.length) * 100)
      : 0,
    gmv: people.reduce((total, person) => total + person.gmv, 0),
    countiesCovered: new Set(people.map((person) => person.county)).size,
    countiesTotal: COUNTIES.length,
    newestJoinedAt: registrations[0]?.joinedAt ?? null,
  }
}

/**
 * Counties ranked by how many accounts they hold — where growth is coming from.
 * Every county is listed, including the ones at zero: a county with nobody in it
 * is the interesting number for a growth team, and omitting it hides the gap.
 */
export function deriveCountyBreakdown(people) {
  return COUNTIES.map((county) => {
    const members = people.filter((person) => person.county === county)
    return {
      county,
      total: members.length,
      farmers: members.filter((person) => person.role === 'farmer').length,
      buyers: members.filter((person) => person.role === 'buyer').length,
      gmv: members.reduce((total, person) => total + person.gmv, 0),
    }
  }).sort((a, b) => b.total - a.total || a.county.localeCompare(b.county))
}

const SEVERITY_RANK = { urgent: 0, review: 1 }

/**
 * Joins each flag to its lot and to today's board, so an operator can check the
 * rule's arithmetic rather than take it on trust. Stopped lots first, then
 * longest-waiting: the queue is worked top to bottom.
 */
export function deriveModerationQueue(flags, listings, boardRowFor) {
  return flags
    .map((flag) => {
      const listing = listings.find((entry) => entry.id === flag.listingId)
      const board = listing ? boardRowFor(listing.crop) : null

      return {
        ...flag,
        listing,
        board,
        /** How far the ask sits from today's board — the number that triggers most rules. */
        vsBoard:
          listing && board
            ? Math.round(((listing.price - board.price) / board.price) * 1000) / 10
            : null,
      }
    })
    .filter((flag) => flag.listing)
    .sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.raisedAt - b.raisedAt,
    )
}

export function deriveOpsSummary({ settlements, queue, checks, openLots }) {
  const sumWhere = (state) =>
    settlements.filter((row) => row.state === state).reduce((total, row) => total + row.amount, 0)

  const dayAgo = Date.now() - 86_400_000

  return {
    held: sumWhere('held'),
    releasing: sumWhere('releasing'),
    failed: sumWhere('failed'),
    feesToday: settlements
      .filter((row) => row.openedAt.getTime() >= dayAgo)
      .reduce((total, row) => total + row.fee, 0),
    flags: queue.length,
    urgentFlags: queue.filter((flag) => flag.severity === 'urgent').length,
    degraded: checks.filter((check) => check.state !== 'ok').length,
    openLots,
  }
}

export function deriveBoardSummary(boardRows, totals) {
  return {
    /** Weighted by nothing clever — a plain mean, and we say so in the UI. */
    averageUplift: boardRows.length
      ? Math.round((boardRows.reduce((total, row) => total + row.uplift, 0) / boardRows.length) * 10) /
        10
      : 0,
    ...totals,
  }
}
