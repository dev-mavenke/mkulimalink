import { UNITS, cropById } from '@/data/catalog'

/**
 * Today's board, seeded.
 *
 * Every wholesale market in Kenya runs off a board: a list of crops, the unit
 * they trade in, and what they fetched today. Prices are what the *farmer*
 * receives — the buyer pays a separate 6% platform fee, so there is no hidden
 * deduction to explain later.
 *
 * `broker` is the going farm-gate offer for the same lot. It is the number every
 * farmer already knows, which makes it the only honest comparison.
 *
 * This is the fallback the app runs on with no Supabase project attached. The
 * live equivalent is `board_today()` and `board_prices`, and the shapes match on
 * purpose — see `src/data/market.js`.
 */

/**
 * Ordered as `CROPS` is, because `crops.sort_order` is generated from that array
 * and `board_today()` sorts by it. If the two orders disagreed, the board would
 * list its rows differently depending on whether a project was attached.
 */
const RATES = [
  { crop: 'tomato', price: 4850, broker: 3900, change: 6.2 },
  { crop: 'potato', price: 3200, broker: 2600, change: 2.4 },
  { crop: 'onion', price: 1450, broker: 1150, change: -3.1 },
  { crop: 'cabbage', price: 1900, broker: 1500, change: 1.1 },
  { crop: 'kale', price: 1250, broker: 980, change: -1.6 },
  { crop: 'avocado', price: 2700, broker: 2100, change: 8.4 },
  { crop: 'banana', price: 980, broker: 760, change: 0 },
  { crop: 'maize', price: 4600, broker: 4050, change: -0.8 },
  { crop: 'beans', price: 11500, broker: 10200, change: 3.6 },
  { crop: 'capsicum', price: 5400, broker: 4300, change: 4.9 },
  { crop: 'eggs', price: 470, broker: 420, change: 0.4 },
  { crop: 'passion', price: 6200, broker: 5000, change: 2.2 },
]

/** Small deterministic PRNG so the 14-day history never reshuffles on reload. */
function seeded(seed) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

/**
 * Walks backwards from today's price so the series always lands on it.
 *
 * Yesterday is not drifted: it is derived from the row's stated 24-hour change,
 * so the delta the board prints is the same arithmetic the chart shows. Once the
 * history is real rows in Postgres the change *is* yesterday's row, and a
 * generated history that disagreed with it would have been a seam.
 */
export function priceHistory(row, days = 14) {
  const random = seeded(
    [...row.crop].reduce((total, character) => total + character.charCodeAt(0), 7),
  )

  const yesterday = row.change
    ? Math.round(row.price / (1 + row.change / 100) / 10) * 10
    : row.price

  const series = [yesterday, row.price]

  for (let step = series.length; step < days; step += 1) {
    const drift = (random() - 0.48) * 0.05
    series.unshift(Math.round((series[0] * (1 - drift)) / 10) * 10)
  }

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  return series.map((price, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { date, price }
  })
}

/** The 24-hour move, read off the history exactly as `board_today()` reads it. */
function changeFrom(history) {
  const [previous, latest] = history.slice(-2)
  if (!previous?.price) return 0
  return Math.round(((latest.price - previous.price) / previous.price) * 1000) / 10
}

export function seedBoardRows() {
  return RATES.map((row) => {
    const crop = cropById(row.crop)
    const unit = UNITS[crop.unit]
    const history = priceHistory(row)

    return {
      id: row.crop,
      crop: crop.name,
      category: crop.category,
      unit: unit.short,
      unitKg: unit.kg,
      price: row.price,
      broker: row.broker,
      change: changeFrom(history),
      uplift: Math.round(((row.price - row.broker) / row.broker) * 1000) / 10,
      history,
    }
  })
}

/**
 * Platform totals that no table in this schema holds yet — they would come from
 * an aggregate over settled deals and active accounts once there is a year of
 * them. Stated here rather than computed from 45 seeded accounts, which would
 * have implied a precision the seed does not have.
 */
export const PLATFORM_TOTALS = {
  farmers: 4812,
  buyers: 61,
  volumeKgToday: 184_600,
  paidOutThisMonth: 41_280_000,
}

/**
 * The 14 days behind those rates, as rows for `public.board_prices`.
 *
 * The seed-SQL generator writes these out, so the walk that draws the trend with
 * no project attached is the same one Postgres serves afterwards — switching a
 * project on does not redraw the chart.
 *
 * Lives here rather than in `market.js` because the generator runs under plain
 * Node, where `import.meta.env` does not exist and importing the Supabase client
 * would throw before it read a single rate.
 */
export function seedBoardHistoryRows() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return RATES.flatMap((rate) =>
    priceHistory(rate).map(({ date, price }) => ({
      cropId: rate.crop,
      /** Days back from today, so the generated SQL stays relative to when it runs. */
      daysAgo: Math.round((today - date) / 86_400_000),
      price,
      // The broker offer tracks the board at the same ratio it does today. Held
      // flat rather than given its own random walk, because the uplift is the
      // number the product is arguing about and a wobbling denominator would
      // make it look noisier than the claim.
      brokerPrice: Math.round((price * rate.broker) / rate.price / 10) * 10,
    })),
  )
}
