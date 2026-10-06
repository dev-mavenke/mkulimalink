/**
 * What an operator has to watch, seeded. The fallback for `flags`, `settlements`
 * and `system_checks`.
 */

/** External probes. The check on the database itself is not here — see `systemChecksFor`. */
const CHECKS = [
  {
    id: 'board',
    label: 'Board publish',
    state: 'ok',
    detail: 'Today’s prices posted 05:12 EAT, ahead of the 06:00 cutoff.',
    meta: '12 crops',
  },
  {
    id: 'feed-wakulima',
    label: 'Wakulima price feed',
    state: 'warning',
    detail: 'No sheet since Monday. Tomato and onion are holding Monday’s reference.',
    meta: '2 days stale',
  },
  {
    id: 'mpesa',
    label: 'M-Pesa B2C',
    state: 'ok',
    detail: 'Settling in about 40 seconds. No failed disbursements today.',
    meta: '38 s median',
  },
  {
    id: 'sms',
    label: 'SMS and USSD gateway',
    state: 'warning',
    detail: 'Safaricom shortcode queue backed up — price alerts are 25 minutes late.',
    meta: '25 min lag',
  },
]

const FLAGS = [
  {
    id: 'flag-118',
    listingId: 'lot-2828',
    rule: 'Possible double post',
    detail: 'Same crate count, grade and photos as lot #2827, posted forty minutes earlier. One of the two is likely a repeat.',
    severity: 'review',
    hoursAgo: 2,
  },
  {
    id: 'flag-117',
    listingId: 'lot-2821',
    rule: 'Certificate unread',
    detail: 'Aflatoxin certificate attached as a photo the parser could not read. Needs a human to confirm the batch number.',
    severity: 'review',
    hoursAgo: 9,
  },
  {
    id: 'flag-116',
    listingId: 'lot-2834',
    rule: 'Repeat cancellation',
    detail: 'Third lot this month from this farmer cancelled after a buyer committed.',
    severity: 'urgent',
    hoursAgo: 21,
  },
  {
    id: 'flag-115',
    listingId: 'lot-2818',
    rule: 'Weight dispute open',
    detail: 'Buyer weighed 1.46 t against 1.58 t declared. Payment held pending both sides’ photos.',
    severity: 'urgent',
    hoursAgo: 30,
  },
]

// Cross-checked against the flag list: lot-2818 has an open weight dispute, so
// its money is *held*, not in flight. A failed disbursement on a lot whose weight
// is still being argued over would be two pages telling one operator two
// different stories.
const SETTLEMENT_SEED = [
  { id: 'st-4471', listingId: 'lot-2825', farmer: 'Chepkoech Ngeno', buyer: 'Nairobi School Meals', amount: 522_000, state: 'releasing', ref: 'TJ7QK4L2XM', hoursAgo: 0.4 },
  { id: 'st-4470', listingId: 'lot-2830', farmer: 'Naserian Cooperative', buyer: 'Kilimo Fresh Ltd', amount: 298_200, state: 'held', ref: 'TJ7PB9R6WC', hoursAgo: 3 },
  { id: 'st-4469', listingId: 'lot-2839', farmer: 'Kipchoge Farms', buyer: 'Nakuru Wholesale Veg', amount: 390_000, state: 'held', ref: 'TJ6ZN3H8VD', hoursAgo: 7 },
  { id: 'st-4468', listingId: 'lot-2818', farmer: 'Moraa Nyakundi', buyer: 'Coast Fresh Traders', amount: 88_000, state: 'held', ref: 'TJ6MC5T1QF', hoursAgo: 12 },
  { id: 'st-4467', listingId: 'lot-2841', farmer: 'Grace Wanjiku', buyer: 'Hotel Sarova Sourcing', amount: 205_800, state: 'failed', ref: 'TJ6HD2Y7KP', hoursAgo: 18 },
  { id: 'st-4466', listingId: 'lot-2836', farmer: 'Njeri Mwangi', buyer: 'Riverside Grocers', amount: 171_520, state: 'paid', ref: 'TJ5WR8G4NB', hoursAgo: 27 },
  { id: 'st-4465', listingId: 'lot-2834', farmer: 'Samuel Otieno', buyer: 'Gathoni Kitchens', amount: 36_300, state: 'paid', ref: 'TJ5KF6J9LT', hoursAgo: 34 },
]

/** The buyer's 6% rides on top; the farmer is paid the full amount. */
export function buyerFee(amount) {
  return Math.round(amount * 0.06)
}

export function seedSettlements() {
  return SETTLEMENT_SEED.map((entry) => ({
    ...entry,
    fee: buyerFee(entry.amount),
    openedAt: new Date(Date.now() - entry.hoursAgo * 3_600_000),
  }))
}

export function seedFlags() {
  return FLAGS.map((flag) => ({
    ...flag,
    raisedAt: new Date(Date.now() - flag.hoursAgo * 3_600_000),
  }))
}

export { CHECKS as SEED_CHECKS, FLAGS as FLAG_SEED, SETTLEMENT_SEED }
