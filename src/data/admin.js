import { systemChecksFor } from '@/data/ops'
import { seedMarket } from '@/data/market'
import { seedFlags, seedSettlements } from '@/data/seed/ops'
import { seedPeople } from '@/data/seed/people'
import {
  deriveAwaitingVerification,
  deriveCountyBreakdown,
  deriveModerationQueue,
  deriveOpsSummary,
  derivePeopleSummary,
  deriveRegistrations,
  deriveSignupsByDay,
} from '@/data/derive'

const API = ''

function parseDay(value) {
  return new Date(`${value}T00:00:00`)
}

function toRegistration(person) {
  return {
    id: person.id,
    accountNo: person.id,
    name: person.name,
    phoneMasked: person.phoneMasked,
    role: person.role,
    county: person.county,
    channel: person.channel,
    state: person.state,
    deals: person.deals,
    gmv: person.gmv,
    joinedAt: person.joinedAt,
  }
}

export function seedAdmin() {
  const people = seedPeople()
  const registrations = deriveRegistrations(people).map(toRegistration)
  const market = seedMarket()
  const settlements = seedSettlements()
  const checks = systemChecksFor(false)
  const moderationQueue = deriveModerationQueue(seedFlags(), market.listings, market.boardRowFor)

  return {
    source: 'seed',
    peopleSummary: derivePeopleSummary(people),
    signupsByDay: deriveSignupsByDay(people),
    countyBreakdown: deriveCountyBreakdown(people),
    registrations,
    listings: [],
    awaitingVerification: deriveAwaitingVerification(registrations),
    settlements,
    moderationQueue,
    systemChecks: checks,
    opsSummary: deriveOpsSummary({
      settlements,
      queue: moderationQueue,
      checks,
      openLots: market.listings.length,
    }),
  }
}

export function emptyAdmin() {
  return {
    source: null,
    peopleSummary: {
      total: 0,
      farmers: 0,
      buyers: 0,
      awaitingId: 0,
      restricted: 0,
      ussdShare: 0,
      gmv: 0,
      countiesCovered: 0,
      countiesTotal: 0,
      newestJoinedAt: null,
    },
    signupsByDay: [],
    countyBreakdown: [],
    registrations: [],
    listings: [],
    awaitingVerification: [],
    settlements: [],
    moderationQueue: [],
    systemChecks: [],
    opsSummary: {
      held: 0,
      releasing: 0,
      failed: 0,
      feesToday: 0,
      flags: 0,
      urgentFlags: 0,
      degraded: 0,
      openLots: 0,
    },
  }
}

async function fromNeon() {
  const res = await fetch(`${API}/api/admin`, { credentials: 'include' })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || 'Could not load the operator view')

  const registrations = (body.registrations ?? []).map((row) => ({
    ...row,
    joinedAt: row.joinedAt ? new Date(row.joinedAt) : new Date(),
  }))

  return {
    source: 'neon',
    peopleSummary: {
      ...body.peopleSummary,
      newestJoinedAt: body.peopleSummary?.newestJoinedAt
        ? new Date(body.peopleSummary.newestJoinedAt)
        : null,
    },
    signupsByDay: (body.signupsByDay ?? []).map((row) => ({
      ...row,
      date: parseDay(row.date),
    })),
    countyBreakdown: body.countyBreakdown ?? [],
    registrations,
    listings: (body.listings ?? []).map((row) => ({
      ...row,
      postedAt: row.postedAt ? new Date(row.postedAt) : new Date(),
    })),
    awaitingVerification: registrations
      .filter((person) => person.state === 'pending')
      .sort((a, b) => a.joinedAt - b.joinedAt),
    settlements: (body.settlements ?? []).map((row) => ({
      ...row,
      openedAt: row.openedAt ? new Date(row.openedAt) : new Date(),
    })),
    moderationQueue: (body.moderationQueue ?? []).map((row) => ({
      ...row,
      raisedAt: row.raisedAt ? new Date(row.raisedAt) : new Date(),
    })),
    systemChecks: body.systemChecks ?? [],
    opsSummary: body.opsSummary,
  }
}

export async function loadAdmin() {
  return fromNeon()
}

async function postAdmin(path, payload) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || 'Could not save that change')
  return { local: false }
}

export function setAccountState(profileId, state, reason) {
  return postAdmin('/api/admin/account-state', { profileId, state, reason })
}

export function resolveFlag(flagId, resolution) {
  return postAdmin('/api/admin/resolve-flag', { flagId, resolution })
}

export function stopListing(flagId, reason) {
  return postAdmin('/api/admin/stop-listing', { flagId, reason })
}