import { useMarket } from '@/context/marketContext'
import { longDate, money, moneyCompact, percent } from '@/lib/format'
import { PageHeader, Stat } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/Icon'

/**
 * Stands in for this farmer's own rows in `public.settlements`.
 *
 * A seeded settlement carries the farmer's name, not their profile id, so there
 * is no key to filter on yet — the operator's Settlement screen reads the real
 * table, this one shows the shape a farmer will see.
 */
const PAYOUTS = [
  { id: 'PO-4471', lot: 'Rosecoco beans', amount: 522_000, daysAgo: 2, state: 'settled', ref: 'QK72HD1P4M' },
  { id: 'PO-4460', lot: 'Kale (sukuma)', amount: 37_200, daysAgo: 6, state: 'settled', ref: 'QK69BB0R2T' },
  { id: 'PO-4452', lot: 'Hass avocado', amount: 171_520, daysAgo: 11, state: 'settled', ref: 'QK64XN8L9C' },
  { id: 'PO-4488', lot: 'Tomato', amount: 212_100, daysAgo: 0, state: 'pending', ref: null },
  // Dates are resolved once, at import — not per render, which would make the
  // component impure and the list re-date itself on every paint.
].map((payout) => ({ ...payout, date: new Date(Date.now() - payout.daysAgo * 86_400_000) }))

const STATES = {
  settled: { label: 'Settled', tone: 'brand', icon: 'check' },
  pending: { label: 'At weigh-in', tone: 'grade', icon: 'clock' },
}

export function Payouts() {
  const { boardSummary } = useMarket()
  const settled = PAYOUTS.filter((payout) => payout.state === 'settled')
  const total = settled.reduce((sum, payout) => sum + payout.amount, 0)
  const held = PAYOUTS.filter((p) => p.state === 'pending').reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Money"
        title="Payouts"
        description="Every settlement lands on the M-Pesa number registered to your account, on the day the weight is confirmed."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Stat label="Paid out" value={moneyCompact(total)} sub={`${settled.length} settlements`} />
        <Stat label="Held at weigh-in" value={moneyCompact(held)} sub="Releases on confirmation" />
      </div>

      <ul className="mt-8 grid gap-px overflow-hidden rounded-panel border border-rule bg-rule">
        {PAYOUTS.map((payout) => {
          const state = STATES[payout.state]

          return (
            <li
              key={payout.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-surface-3 px-4 py-3.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-wash text-brand">
                <Icon name={state.icon} className="text-base" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{payout.lot}</p>
                <p className="eyebrow mt-1 text-fg-3">
                  {longDate(payout.date)}
                  {payout.ref ? ` · ${payout.ref}` : ' · awaiting weigh-in'}
                </p>
              </div>

              <Badge tone={state.tone}>{state.label}</Badge>

              <p className="tnum ml-auto font-mono text-sm font-semibold text-fg sm:ml-0">
                {money(payout.amount)}
              </p>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 flex items-start gap-2 text-xs text-fg-3">
        <Icon name="info" className="mt-px shrink-0 text-sm" />
        MkulimaLink takes nothing from your side. The {money(Math.round(total * 0.06))} of fees on
        these lots was paid by the buyers, on top of your price.
        {boardSummary.averageUplift > 0
          ? ` Board average today: ${percent(boardSummary.averageUplift, { signed: false })} over the broker rate.`
          : null}
      </p>
    </div>
  )
}
