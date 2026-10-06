/**
 * The vocabulary of an account: what each state and channel means, and what an
 * operator does about it. The rows themselves come from `src/data/admin.js`,
 * which reads Postgres or falls back to the seed.
 */

/**
 * Account lifecycle. Every state has an operator action attached to it.
 *
 * `pending` is deliberately neutral rather than amber: it is the expected first
 * state of every account, not a fault, and colouring the normal case as a warning
 * trains operators to ignore the colour.
 *
 * These ids are the `public.account_state` enum. Adding one means a migration.
 */
export const STATES = {
  pending: { label: 'Awaiting ID', tone: 'neutral', note: 'Signed up, not yet verified. Cannot trade.' },
  active: { label: 'Active', tone: 'brand', note: 'Verified and trading.' },
  limited: { label: 'Limited', tone: 'warning', note: 'Can browse, cannot post or bid, pending a review.' },
  suspended: { label: 'Suspended', tone: 'alert', note: 'Blocked after a confirmed dispute.' },
}

/** `public.signup_channel`. */
export const CHANNELS = {
  ussd: { label: 'USSD', note: 'Feature phone — send prices by SMS' },
  android: { label: 'Android', note: 'MkulimaLink app' },
  web: { label: 'Web', note: 'Browser' },
}

/** `public.account_role`. Staff is a flag on a profile, not a third role here. */
export const ROLES = {
  farmer: { label: 'Farmer' },
  buyer: { label: 'Buyer' },
}
