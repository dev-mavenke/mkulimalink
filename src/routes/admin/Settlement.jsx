import { SETTLEMENT_STATES } from '@/data/ops'
import { useAdmin } from '@/context/adminContext'
import { lotRef, money, moneyCompact, number, timeAgo } from '@/lib/format'
import { PageHeader, Stat } from '@/components/layout/PageHeader'
import { Head, Row, Table, Td, Th } from '@/components/admin/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/Icon'

/**
 * Money in flight.
 *
 * `Held` is the resting state, not a problem: the buyer has paid and the funds
 * wait until both sides agree the weight at collection. The only rows that need
 * a person are the failures, so they carry the one action on the page.
 */
export function AdminSettlement() {
  const { settlements, opsSummary, source, loading, error, reload } = useAdmin()

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <ErrorState title="Settlement didn’t load" detail={error} onRetry={reload} />
      </div>
    )
  }

  // Four money tiles reading KSh 0 is a specific and wrong claim: that nothing is
  // held anywhere. It waits for the figures rather than inventing calm ones.
  if (loading && source === null) {
    return (
      <div
        className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10"
        role="status"
        aria-label="Loading settlement"
      >
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-9 w-56" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="mt-8 grid gap-px">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-none" />
          ))}
        </div>
      </div>
    )
  }

  const failed = settlements.filter((row) => row.state === 'failed')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={`${number(settlements.length)} open settlements`}
        title="Settlement"
        description="Farmers are paid the full amount. The 6% platform fee is charged to the buyer on top and never deducted from a payout."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Held to weigh-in"
          value={moneyCompact(opsSummary.held)}
          sub="Normal — waiting on collection"
        />
        <Stat label="Releasing now" value={money(opsSummary.releasing)} sub="M-Pesa B2C in flight" />
        <Stat
          label="Failed"
          value={money(opsSummary.failed)}
          sub={failed.length === 1 ? '1 payout to retry' : `${failed.length} payouts to retry`}
        />
        <Stat label="Fees earned today" value={money(opsSummary.feesToday)} sub="Buyer side, 6%" />
      </div>

      {failed.length > 0 ? (
        <div className="mt-4 rounded-panel border border-alert/40 bg-alert-wash p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-alert-fg">
            <Icon name="info" className="text-base" />
            {failed.length === 1
              ? 'One payout did not go through'
              : `${failed.length} payouts did not go through`}
          </h2>
          <p className="mt-1.5 text-sm text-alert-fg/90">
            {failed.map((row) => row.farmer).join(', ')} {failed.length === 1 ? 'has' : 'have'} not
            been paid.
          </p>
          {/*
            The retry lives here rather than in the table row. It is the only
            action on the page, and in a nine-column table it sat past the right
            edge at anything under a 1,230px window — reachable only by scrolling
            sideways, which is not where an operator looks for the thing to do.
          */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary" icon="wallet" disabled>
              Retry {failed.length === 1 ? 'the payout' : `${failed.length} payouts`}
            </Button>
            <p className="text-xs text-alert-fg/90">
              Needs the M-Pesa B2C credentials, so it cannot run from this build yet.
            </p>
          </div>
        </div>
      ) : null}

      {settlements.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon="wallet"
          title="No money in flight"
          body="A settlement opens the moment a buyer pays for a lot, and stays on this page until the payout clears."
        />
      ) : (
        <Table caption="Open and recent settlements" className="mt-8" minWidth="52rem">
          <Head>
            <Th>Lot</Th>
            <Th>Farmer</Th>
            <Th>Buyer</Th>
            <Th numeric>To farmer</Th>
            <Th numeric>Buyer fee</Th>
            <Th>State</Th>
            <Th>Opened</Th>
            <Th>M-Pesa ref</Th>
          </Head>
          <tbody>
            {settlements.map((row) => {
              const state = SETTLEMENT_STATES[row.state]

              return (
                <Row key={row.id}>
                  <Td className="whitespace-nowrap">
                    {/* `listing_id` is nullable — a lot can be taken down while its
                        money is still in flight, and the payout has to survive
                        that. `lotRef` prints an en dash rather than `#undefined`. */}
                    <span className="font-semibold text-fg">{lotRef(row.listingId)}</span>
                    <span className="mt-0.5 block text-xs text-fg-3">{row.id}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{row.farmer}</Td>
                  <Td className="whitespace-nowrap">{row.buyer}</Td>
                  <Td numeric className="whitespace-nowrap">
                    {money(row.amount)}
                  </Td>
                  <Td numeric className="whitespace-nowrap text-fg-3">
                    {money(row.fee)}
                  </Td>
                  <Td>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{timeAgo(row.openedAt)}</Td>
                  <Td className="tnum font-mono text-xs">
                    {row.ref === null ? (
                      <span className="text-fg-3">—</span>
                    ) : row.state === 'failed' ? (
                      <span className="text-fg-3 line-through">{row.ref}</span>
                    ) : (
                      row.ref
                    )}
                  </Td>
                </Row>
              )
            })}
          </tbody>
        </Table>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-fg-3">
        <Icon name="shield" className="mt-px shrink-0 text-sm" />
        A held payout releases automatically once the farmer and the buyer both confirm the weight.
        Nobody at MkulimaLink can release it early.
      </p>
    </div>
  )
}
