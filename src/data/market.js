import { supabase, supabaseReady } from '@/lib/supabase'
import { PLATFORM_TOTALS, seedBoardRows } from '@/data/seed/board'
import { hydrateListing, seedListings } from '@/data/seed/listings'
import { deriveBoardSummary } from '@/data/derive'

/**
 * The market side: today's board and the open lots.
 *
 * One loader with two sources. Both return the same shape, so no screen knows or
 * cares which one it got — `source` is exposed only so the operator health strip
 * can say which it is, and so the sign-in page can be honest about the demo
 * session.
 */

/** A `date` column arrives as 'YYYY-MM-DD'. Parse to local midnight, as the seed does. */
function parseDay(value) {
  return new Date(`${value}T00:00:00`)
}

function assemble({ boardRows, listings, boardDate }) {
  const boardIndex = new Map(boardRows.map((row) => [row.id, row]))
  const listingIndex = new Map(listings.map((listing) => [listing.id, listing]))

  return {
    boardRows,
    boardDate,
    boardSummary: deriveBoardSummary(boardRows, PLATFORM_TOTALS),
    boardRowFor: (cropId) => boardIndex.get(cropId),
    listings,
    listingById: (id) => listingIndex.get(id),
  }
}

/**
 * The seeded market, built synchronously.
 *
 * Separate from `loadMarket` so a provider with no project configured can hold
 * real rows in its very first render instead of painting a skeleton for one tick
 * and then replacing it.
 */
export function seedMarket() {
  return {
    source: 'seed',
    ...assemble({
      boardRows: seedBoardRows(),
      listings: seedListings(),
      boardDate: new Date(),
    }),
  }
}

/**
 * The same shape with nothing in it.
 *
 * What a consumer sees while a live load is in flight. Built through `assemble`
 * rather than written out, so it cannot drift from the real thing. Screens are
 * still expected to check `loading` before they print a headline — this exists so
 * that forgetting to renders an empty table rather than a blank page.
 */
export function emptyMarket() {
  return {
    source: null,
    ...assemble({ boardRows: [], listings: [], boardDate: null }),
  }
}

async function fromSupabase() {
  const since = new Date()
  since.setDate(since.getDate() - 13)
  const sinceDay = since.toISOString().slice(0, 10)

  const [board, history, lots] = await Promise.all([
    supabase.rpc('board_today'),
    supabase
      .from('board_prices')
      .select('crop_id, board_date, price')
      .gte('board_date', sinceDay)
      .order('board_date'),
    supabase
      .from('listings')
      .select(
        'id, crop_id, grade_id, quantity, price, county, ward, ready_in_days, note, created_at, farmer_name, farmer_lots, farmer_rating',
      )
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
  ])

  const failure = board.error ?? history.error ?? lots.error
  if (failure) throw failure

  const trends = new Map()
  for (const row of history.data) {
    if (!trends.has(row.crop_id)) trends.set(row.crop_id, [])
    trends.get(row.crop_id).push({ date: parseDay(row.board_date), price: row.price })
  }

  const boardRows = board.data.map((row) => ({
    id: row.crop_id,
    crop: row.crop_name,
    category: row.category,
    unit: row.unit_short,
    unitKg: Number(row.unit_kg),
    price: row.price,
    broker: row.broker_price,
    change: Number(row.change),
    uplift: Number(row.uplift),
    history: trends.get(row.crop_id) ?? [],
  }))

  const listings = lots.data.map((row) =>
    hydrateListing({
      id: row.id,
      crop: row.crop_id,
      grade: row.grade_id,
      quantity: row.quantity,
      price: row.price,
      county: row.county,
      ward: row.ward,
      farmer: {
        name: row.farmer_name,
        lots: row.farmer_lots,
        rating: row.farmer_rating === null ? null : Number(row.farmer_rating),
      },
      readyIn: row.ready_in_days,
      note: row.note,
      postedAt: new Date(row.created_at),
    }),
  )

  return {
    source: 'supabase',
    ...assemble({
      boardRows,
      listings,
      boardDate: board.data[0] ? parseDay(board.data[0].board_date) : new Date(),
    }),
  }
}

export async function loadMarket() {
  if (!supabaseReady) return seedMarket()
  return fromSupabase()
}

/**
 * Post a lot.
 *
 * `farmer_id` is sent rather than filled in by a trigger because the insert
 * policy is `farmer_id = current_profile_id()` — the client has to name itself,
 * and Postgres refuses the row if it named anybody else. `farmer_name` is
 * denormalised on the table so the lot survives the account being deleted.
 *
 * The policy also requires an `active` farmer, so a pending account is refused
 * here. That check is repeated in the form, not because the client is trusted
 * with it, but so the person gets told why instead of "permission denied".
 */
export async function createListing(profile, form) {
  if (!supabaseReady) return { local: true }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      farmer_id: profile.id,
      farmer_name: profile.name,
      crop_id: form.crop,
      grade_id: form.grade,
      quantity: Number(form.quantity),
      price: Number(form.price),
      county: form.county,
      ward: form.ward.trim(),
      ready_in_days: Number(form.readyIn),
      note: form.note.trim() || null,
    })
    .select('id')
    .single()

  if (error) throw error
  return { local: false, id: data.id }
}
