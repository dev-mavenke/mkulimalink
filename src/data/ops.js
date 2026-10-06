import { SEED_CHECKS } from '@/data/seed/ops'

/**
 * The vocabulary of the operator screens. Rows come from `src/data/admin.js`.
 */

/**
 * Three states, and none of them is signalled by colour on its own — each ships
 * with a word and a glyph. Three rather than four because a fourth level would
 * have to share a colour with one of these, and a status colour that means two
 * things is worse than a coarser scale.
 *
 * These ids are the `public.health_state` enum.
 */
export const HEALTH = {
  ok: { label: 'Operating', icon: 'check', tone: 'brand' },
  warning: { label: 'Degraded', icon: 'info', tone: 'warning' },
  critical: { label: 'Down', icon: 'close', tone: 'alert' },
}

/**
 * Two severities, not a 1–5 scale: either a lot can keep trading while someone
 * checks it, or it cannot. That is the only distinction the queue acts on.
 *
 * The queue's *order* is not here — it is in `deriveModerationQueue` and in
 * `admin_moderation_queue()`, which is where the sort actually happens.
 */
export const SEVERITIES = {
  review: { label: 'Check when you can', tone: 'warning' },
  urgent: { label: 'Trading stopped', tone: 'alert' },
}

/**
 * Money in flight. `held` is the normal resting state: a buyer has paid, and the
 * funds sit until both sides confirm the weight at collection.
 */
export const SETTLEMENT_STATES = {
  held: { label: 'Held to weigh-in', tone: 'neutral' },
  releasing: { label: 'Releasing', tone: 'brand' },
  paid: { label: 'Paid', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'alert' },
}

/**
 * The status strip.
 *
 * The external probes are read from `public.system_checks` when a project is
 * attached. The check on the *database itself* is appended here from the client's
 * own connection state rather than selected from a table, because a monitor that
 * lies about the one thing it can actually see is worse than no monitor — a row
 * in Postgres saying "Postgres is reachable" is only ever readable when it is
 * already true.
 */
export function systemChecksFor(connected, checks = SEED_CHECKS) {
  return [
    ...checks,
    {
      id: 'backend',
      label: 'Supabase project',
      state: connected ? 'ok' : 'critical',
      detail: connected
        ? 'Auth and Postgres reachable with the configured project.'
        : 'No project configured. Sign-in is a local demo session, the screens are showing seeded data, and nothing is being written.',
      meta: connected ? 'Connected' : 'Not configured',
    },
  ]
}
