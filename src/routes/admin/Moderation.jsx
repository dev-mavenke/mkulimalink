import { useAdmin } from '@/context/adminContext'
import { money, number } from '@/lib/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { Head, Row, Table, Td, Th } from '@/components/admin/Table'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'

export function AdminModeration() {
  const { listings = [], opsSummary, loading, error, reload, stopListing } = useAdmin()

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ErrorState title="Lots didn’t load" detail={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={`${number(opsSummary?.openLots ?? listings.length)} open`}
        title="Lots"
        description="Harvests posted by farmers. Staff cannot post from here."
      />

      {listings.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon="sprout"
          title="No open lots"
          body="A lot appears here when a farmer publishes a harvest."
        />
      ) : (
        <Table caption="Open lots" className="mt-6" minWidth="48rem">
          <Head>
            <Th>Farmer</Th>
            <Th>Crop</Th>
            <Th>County</Th>
            <Th numeric>Qty</Th>
            <Th numeric>Price</Th>
            <Th> </Th>
          </Head>
          <tbody>
            {listings.map((lot) => (
              <Row key={lot.id}>
                <Td>{lot.farmer}</Td>
                <Td>{lot.crop}</Td>
                <Td>{lot.county}</Td>
                <Td numeric>{lot.quantity}</Td>
                <Td numeric>{money(lot.price)}</Td>
                <Td>
                  <Button size="sm" variant="secondary" onClick={() => stopListing(lot.id, 'Stopped by staff')}>
                    Stop
                  </Button>
                </Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}