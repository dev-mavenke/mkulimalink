import { SEED_CHECKS } from '@/data/seed/ops'


export const HEALTH = {
  ok: { label: 'Operating', icon: 'check', tone: 'brand' },
  warning: { label: 'Degraded', icon: 'info', tone: 'warning' },
  critical: { label: 'Down', icon: 'close', tone: 'alert' },
}


export const SEVERITIES = {
  review: { label: 'Check when you can', tone: 'warning' },
  urgent: { label: 'Trading stopped', tone: 'alert' },
}


export const SETTLEMENT_STATES = {
  held: { label: 'Held to weigh-in', tone: 'neutral' },
  releasing: { label: 'Releasing', tone: 'brand' },
  paid: { label: 'Paid', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'alert' },
}


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
