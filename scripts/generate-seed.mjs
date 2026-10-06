/**
 * Writes supabase/seed.sql from the modules the app already runs on.
 *
 *   npm run seed:sql
 *
 * Generated rather than transcribed. The client keeps its own copy of the crop
 * catalogue and the demo rows so it can run with no project attached, and a
 * hand-written seed file would be a second copy of forty-five accounts, nine
 * lots and a hundred and sixty-eight board prices — wrong the first time either
 * side was edited, and wrong silently.
 *
 * Timestamps come out relative to `now()` rather than as fixed instants, because
 * the demo data is *about* freshness: a lot posted forty minutes ago and an ID
 * check that has been waiting six hours. Baked-in dates would make a project
 * seeded last month read as a dead market.
 */

import { register } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

register('./alias-loader.mjs', import.meta.url)

const { COUNTIES, CROPS, GRADES, REFERENCE_MARKETS, UNITS } = await import('@/data/catalog')
const { seedBoardHistoryRows } = await import('@/data/seed/board')
const { LISTING_SEED } = await import('@/data/seed/listings')
const { PEOPLE_SEED } = await import('@/data/seed/people')
const { FLAG_SEED, SEED_CHECKS, SETTLEMENT_SEED } = await import('@/data/seed/ops')

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

/** A quoted string, or `null`. Enum values and dates go through here too — Postgres casts them from a literal. */
function text(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

function num(value) {
  if (value === null || value === undefined) return 'null'
  return String(value)
}

/**
 * `hoursAgo` as an interval off `now()`. Rounded to the minute: the seed's
 * fractional hours are all whole minutes, and a timestamp carrying nine decimal
 * places of a fake hour would read as precision that isn't there.
 */
function ago(hours) {
  const minutes = Math.round(hours * 60)
  return `now() - interval '${minutes} minutes'`
}

/**
 * A trading day, counted back from today in Nairobi.
 *
 * The board's day is a Kenyan calendar day, so it is computed in that zone here
 * rather than in whatever zone the machine running this script happens to be in.
 */
function tradingDay(daysAgo) {
  const today = "(now() at time zone 'Africa/Nairobi')::date"
  return daysAgo === 0 ? today : `${today} - ${daysAgo}`
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

/**
 * One multi-row insert, upserting on the natural key.
 *
 * Upsert rather than plain insert so the file can be re-run against a project
 * that is already seeded — after editing the catalogue, say — without either
 * duplicating the demo market or having to drop it first. A table whose only
 * column is its key has nothing to assign, so it takes `do nothing`.
 */
function upsert({ into, columns, key, rows, note }) {
  const updatable = columns.filter((column) => !key.includes(column))

  const resolution = updatable.length
    ? [
        `on conflict (${key.join(', ')}) do update set`,
        `${updatable.map((column) => `  ${column} = excluded.${column}`).join(',\n')};`,
      ]
    : [`on conflict (${key.join(', ')}) do nothing;`]

  return [
    note ? `-- ${note}` : null,
    `insert into public.${into} (${columns.join(', ')}) values`,
    `${rows.map((row) => `  (${columns.map((column) => row[column]).join(', ')})`).join(',\n')}`,
    ...resolution,
  ]
    .filter(Boolean)
    .join('\n')
}

/** A block comment above a statement, wrapped as SQL line comments. */
function lines(...parts) {
  return parts.join('\n-- ')
}

const statements = []

// -- Reference data ---------------------------------------------------------

statements.push(
  upsert({
    into: 'units',
    columns: ['id', 'label', 'short_label', 'kg'],
    key: ['id'],
    note: 'The units farmers and buyers quote in, and what one of each weighs.',
    rows: Object.entries(UNITS).map(([id, unit]) => ({
      id: text(id),
      label: text(unit.label),
      short_label: text(unit.short),
      kg: num(unit.kg),
    })),
  }),
)

statements.push(
  upsert({
    into: 'grades',
    columns: ['id', 'label', 'note', 'sort_order'],
    key: ['id'],
    rows: GRADES.map((grade, index) => ({
      id: text(grade.id),
      label: text(grade.label),
      note: text(grade.note),
      sort_order: num(index),
    })),
  }),
)

statements.push(
  upsert({
    into: 'crops',
    columns: ['id', 'name', 'category', 'unit_id', 'sort_order'],
    key: ['id'],
    note: 'sort_order is the order the board lists them in — see board_today().',
    rows: CROPS.map((crop, index) => ({
      id: text(crop.id),
      name: text(crop.name),
      category: text(crop.category),
      unit_id: text(crop.unit),
      sort_order: num(index),
    })),
  }),
)

statements.push(
  upsert({
    into: 'counties',
    columns: ['name'],
    key: ['name'],
    note: 'Counties that supply Nairobi and Mombasa in volume.',
    rows: COUNTIES.map((name) => ({ name: text(name) })),
  }),
)

statements.push(
  upsert({
    into: 'reference_markets',
    columns: ['id', 'name', 'city'],
    key: ['id'],
    rows: REFERENCE_MARKETS.map((market) => ({
      id: text(market.id),
      name: text(market.name),
      city: text(market.city),
    })),
  }),
)

// -- Accounts --------------------------------------------------------------

statements.push(
  upsert({
    into: 'profiles',
    columns: [
      'account_no',
      'name',
      'role',
      'county',
      'channel',
      'state',
      'phone',
      'deals',
      'gmv',
      'created_at',
    ],
    key: ['account_no'],
    note: lines(
      'Demo accounts. user_id stays null on every one: two thirds of them',
      'registered over USSD and have no login at all, and the rest are demo rows',
      'with no auth.users behind them. account_no_seq starts at 1190, so the first',
      'real signup continues the series rather than colliding with these.',
    ),
    rows: PEOPLE_SEED.map((person) => ({
      account_no: text(person.id),
      name: text(person.name),
      role: text(person.role),
      county: text(person.county),
      channel: text(person.channel),
      state: text(person.state),
      phone: text(person.phone),
      deals: num(person.deals),
      gmv: num(person.gmv),
      created_at: ago(person.hoursAgo),
    })),
  }),
)

// -- Lots ------------------------------------------------------------------

statements.push(
  upsert({
    into: 'listings',
    columns: [
      'id',
      'farmer_name',
      'farmer_lots',
      'farmer_rating',
      'crop_id',
      'grade_id',
      'quantity',
      'price',
      'county',
      'ward',
      'ready_in_days',
      'status',
      'note',
      'created_at',
    ],
    key: ['id'],
    note: lines(
      'farmer_id is null: these nine farmers are not among the seeded accounts, and',
      'inventing links would have put nine fake relationships in on day one. The',
      'denormalised name is what the schema keeps a lot readable by.',
    ),
    rows: LISTING_SEED.map((lot) => ({
      id: text(lot.id),
      farmer_name: text(lot.farmer.name),
      farmer_lots: num(lot.farmer.lots),
      farmer_rating: num(lot.farmer.rating),
      crop_id: text(lot.crop),
      grade_id: text(lot.grade),
      quantity: num(lot.quantity),
      price: num(lot.price),
      county: text(lot.county),
      ward: text(lot.ward),
      ready_in_days: num(lot.readyIn),
      status: text('open'),
      note: text(lot.note),
      created_at: ago(lot.hoursAgo),
    })),
  }),
)

// -- The board ------------------------------------------------------------

statements.push(
  upsert({
    into: 'board_prices',
    columns: ['board_date', 'crop_id', 'price', 'broker_price'],
    key: ['board_date', 'crop_id'],
    note: lines(
      'Fourteen trading days per crop, walked backwards from today by the same',
      'function that draws the trend with no project attached — so switching one on',
      "does not redraw the chart. Yesterday is derived from each row's stated",
      '24-hour change, which is why board_today() can read the change off the data',
      'instead of storing it.',
    ),
    rows: seedBoardHistoryRows().map((row) => ({
      board_date: tradingDay(row.daysAgo),
      crop_id: text(row.cropId),
      price: num(row.price),
      broker_price: num(row.brokerPrice),
    })),
  }),
)

// -- Money in flight ------------------------------------------------------

statements.push(
  upsert({
    into: 'settlements',
    columns: [
      'id',
      'listing_id',
      'farmer_name',
      'buyer_name',
      'amount',
      'state',
      'mpesa_ref',
      'opened_at',
      'settled_at',
    ],
    key: ['id'],
    note: lines(
      'fee is a generated column — public.buyer_fee(amount) — so it is deliberately',
      "not written here. The buyer's 6% rides on top of the amount and the farmer is",
      'paid in full, and the schema is where that rule is kept rather than the seed.',
    ),
    rows: SETTLEMENT_SEED.map((row) => ({
      id: text(row.id),
      listing_id: text(row.listingId),
      farmer_name: text(row.farmer),
      buyer_name: text(row.buyer),
      amount: num(row.amount),
      state: text(row.state),
      mpesa_ref: text(row.ref),
      opened_at: ago(row.hoursAgo),
      // A paid settlement needs to say when — settlements_paid_has_timestamp.
      // M-Pesa B2C lands in about forty seconds, so a minute after opening.
      settled_at: row.state === 'paid' ? ago(row.hoursAgo - 1 / 60) : 'null',
    })),
  }),
)

// -- Flagged lots ---------------------------------------------------------

statements.push(
  upsert({
    into: 'flags',
    columns: ['id', 'listing_id', 'rule', 'detail', 'severity', 'raised_at'],
    key: ['id'],
    note: 'All open — resolved_at, resolved_by and resolution stay null.',
    rows: FLAG_SEED.map((flag) => ({
      id: text(flag.id),
      listing_id: text(flag.listingId),
      rule: text(flag.rule),
      detail: text(flag.detail),
      severity: text(flag.severity),
      raised_at: ago(flag.hoursAgo),
    })),
  }),
)

// -- Service health -------------------------------------------------------

statements.push(
  upsert({
    into: 'system_checks',
    columns: ['id', 'label', 'state', 'detail', 'meta', 'sort_order'],
    key: ['id'],
    note: lines(
      'The external probes only. There is no row here for Postgres itself: the',
      'client derives that from its own connection, because a row in Postgres',
      'saying Postgres is reachable is only ever readable when it already is.',
    ),
    rows: SEED_CHECKS.map((check, index) => ({
      id: text(check.id),
      label: text(check.label),
      state: text(check.state),
      detail: text(check.detail),
      meta: text(check.meta),
      sort_order: num(index),
    })),
  }),
)

// ---------------------------------------------------------------------------
// Write it
// ---------------------------------------------------------------------------

const header = `-- MkulimaLink demo data.
--
-- Generated file — do not edit. Regenerate with:
--
--     npm run seed:sql
--
-- Built from src/data/catalog.js and src/data/seed/*, which are the same modules
-- the app falls back to when no project is configured. Editing those and running
-- the script again is the way to change what is in here.
--
-- Every timestamp is relative to when this file is applied, not to when it was
-- written: the demo market is about freshness, and fixed dates would make a
-- project seeded last month read as a dead one.
--
-- Safe to re-run. Each statement upserts on a natural key, so applying it twice
-- refreshes the timestamps instead of duplicating the market.

begin;

`

const body = statements.join('\n\n') + '\n'

const out = new URL('../supabase/seed.sql', import.meta.url)
await writeFile(out, `${header}${body}\ncommit;\n`, 'utf8')

const rows = statements.reduce(
  (total, statement) => total + statement.split('\n').filter((line) => line.startsWith('  (')).length,
  0,
)
console.log(
  `Wrote ${fileURLToPath(out)} — ${statements.length} statements, ${rows} rows.`,
)
