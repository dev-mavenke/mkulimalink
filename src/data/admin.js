import { supabase, supabaseReady } from '@/lib/supabase'
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

/**
 * Everything the operator screens read.
 *
 * In live mode the aggregates come back from `admin_*` functions rather than from
 * a select over every profile, for two reasons. The dashboard needs eight numbers
 * and a fourteen-bar chart; pulling forty-five full records to the browser to
 * compute them would put every phone number on the wire to draw a table that
 * masks them. And the functions raise `42501` when the caller is not staff, so a
 * non-operator gets a refusal rather than a plausible-looking set of zeros.
 *
 * In seed mode the same shapes are derived locally by `src/data/derive.js`, whose
 * functions are written to mirror those SQL functions one for one.
 */

function parseDay(value) {
  return new Date(`${value}T00:00:00`)
}

/**
 * One row of the registrations table.
 *
 * The seeded accounts have no uuid — their account number *is* their identity —
 * so `id` is whatever uniquely names the row in the source it came from. It is
 * only ever used as a key and as the argument to `setAccountState`, which does
 * nothing without a project.
 */
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

/**
 * The seeded operator view, built synchronously — so a provider with no project
 * configured holds real rows on its first render rather than a skeleton.
 */
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

/**
 * The same shape with nothing in it, for a provider whose first live load is
 * still in flight. The summaries are zeros rather than nulls so a card that
 * renders before its guard reads `KSh 0` instead of throwing.
 */
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

async function fromSupabase() {
  const [summary, signups, counties, ops, accounts, queue, settlements, checks] = await Promise.all([
    supabase.rpc('admin_people_summary').maybeSingle(),
    supabase.rpc('admin_signups_by_day', { p_days: 14 }),
    supabase.rpc('admin_county_breakdown'),
    supabase.rpc('admin_ops_summary').maybeSingle(),
    supabase.rpc('admin_registrations'),
    supabase.rpc('admin_moderation_queue'),
    supabase
      .from('settlements')
      .select('id, listing_id, farmer_name, buyer_name, amount, fee, state, mpesa_ref, opened_at')
      .order('opened_at', { ascending: false }),
    supabase
      .from('system_checks')
      .select('id, label, state, detail, meta')
      .order('sort_order'),
  ])

  const failure = [summary, signups, counties, ops, accounts, queue, settlements, checks].find(
    (result) => result.error,
  )?.error
  if (failure) throw failure

  const registrations = accounts.data.map((row) => ({
    id: row.id,
    accountNo: row.account_no,
    name: row.name,
    phoneMasked: row.phone_masked,
    role: row.role,
    county: row.county,
    channel: row.channel,
    state: row.state,
    deals: row.deals,
    gmv: Number(row.gmv),
    joinedAt: new Date(row.created_at),
  }))

  return {
    source: 'supabase',
    peopleSummary: {
      total: Number(summary.data.total),
      farmers: Number(summary.data.farmers),
      buyers: Number(summary.data.buyers),
      awaitingId: Number(summary.data.awaiting_id),
      restricted: Number(summary.data.restricted),
      ussdShare: Number(summary.data.ussd_share),
      gmv: Number(summary.data.gmv),
      countiesCovered: Number(summary.data.counties_covered),
      countiesTotal: Number(summary.data.counties_total),
      newestJoinedAt: summary.data.newest_joined_at
        ? new Date(summary.data.newest_joined_at)
        : null,
    },
    signupsByDay: signups.data.map((row) => ({
      date: parseDay(row.day),
      farmers: Number(row.farmers),
      buyers: Number(row.buyers),
      total: Number(row.total),
    })),
    countyBreakdown: counties.data.map((row) => ({
      county: row.county,
      total: Number(row.total),
      farmers: Number(row.farmers),
      buyers: Number(row.buyers),
      gmv: Number(row.gmv),
    })),
    registrations,
    awaitingVerification: registrations
      .filter((person) => person.state === 'pending')
      .sort((a, b) => a.joinedAt - b.joinedAt),
    settlements: settlements.data.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      farmer: row.farmer_name,
      buyer: row.buyer_name,
      amount: Number(row.amount),
      fee: Number(row.fee),
      state: row.state,
      ref: row.mpesa_ref,
      openedAt: new Date(row.opened_at),
    })),
    // Rebuilt into the nested shape the screen renders, so the card markup does
    // not have to care that Postgres returned it flat.
    moderationQueue: queue.data.map((row) => ({
      id: row.id,
      rule: row.rule,
      detail: row.detail,
      severity: row.severity,
      raisedAt: new Date(row.raised_at),
      vsBoard: row.vs_board === null ? null : Number(row.vs_board),
      board: row.board_price === null ? null : { price: row.board_price },
      listing: {
        id: row.listing_id,
        cropName: row.crop_name,
        unit: { short: row.unit_short },
        quantity: row.quantity,
        price: row.price,
        totalKg: Number(row.total_kg),
        county: row.county,
        ward: row.ward,
        farmer: { name: row.farmer_name, lots: row.farmer_lots },
      },
    })),
    systemChecks: systemChecksFor(true, checks.data),
    opsSummary: {
      held: Number(ops.data.held),
      releasing: Number(ops.data.releasing),
      failed: Number(ops.data.failed),
      feesToday: Number(ops.data.fees_today),
      flags: Number(ops.data.flags),
      urgentFlags: Number(ops.data.urgent_flags),
      // `degraded` counts rows in system_checks; the connection check is appended
      // client-side and is `ok` by definition if this query returned at all.
      degraded: Number(ops.data.degraded),
      openLots: Number(ops.data.open_lots),
    },
  }
}

export async function loadAdmin() {
  if (!supabaseReady) return seedAdmin()
  return fromSupabase()
}

/**
 * Operator writes. Each one is a `security definer` function that re-checks
 * `is_staff()` and writes to `admin_actions`, so the audit trail does not depend
 * on the client asking for it.
 *
 * In seed mode there is nothing to write to. These return `{ local: true }` and
 * the screens say so on the page, rather than showing a decision that quietly
 * disappears on reload.
 */
export async function setAccountState(profileId, state, reason) {
  if (!supabaseReady) return { local: true }
  const { error } = await supabase.rpc('admin_set_account_state', {
    p_profile: profileId,
    p_state: state,
    p_reason: reason ?? null,
  })
  if (error) throw error
  return { local: false }
}

export async function resolveFlag(flagId, resolution) {
  if (!supabaseReady) return { local: true }
  const { error } = await supabase.rpc('admin_resolve_flag', {
    p_flag: flagId,
    p_resolution: resolution ?? null,
  })
  if (error) throw error
  return { local: false }
}

export async function stopListing(flagId, reason) {
  if (!supabaseReady) return { local: true }
  const { error } = await supabase.rpc('admin_stop_listing', {
    p_flag: flagId,
    p_reason: reason ?? null,
  })
  if (error) throw error
  return { local: false }
}
