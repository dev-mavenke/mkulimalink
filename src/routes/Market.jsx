import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, COUNTIES, CROPS, GRADES } from '@/data/catalog'
import { useMarket } from '@/context/marketContext'
import { number, weight } from '@/lib/format'
import { PageHeader } from '@/components/layout/PageHeader'
import { ListingCard } from '@/components/ListingCard'
import { EmptyState, ErrorState, ListingSkeleton } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PriceBoard } from '@/components/PriceBoard'

const SORTS = {
  fresh: { label: 'Newest first', compare: (a, b) => b.postedAt - a.postedAt },
  volume: { label: 'Largest lot', compare: (a, b) => b.totalKg - a.totalKg },
  price: { label: 'Lowest price', compare: (a, b) => a.price / a.unit.kg - b.price / b.unit.kg },
  ready: { label: 'Ready soonest', compare: (a, b) => a.readyIn - b.readyIn },
}

/**
 * Open lots.
 *
 * Filter state lives in the URL, so a buyer can bookmark "Grade 1 tomatoes in
 * Kirinyaga" and the board can deep-link a crop straight into this view.
 */
export function Market() {
  const [params, setParams] = useSearchParams()
  const { listings, loading, error, reload } = useMarket()

  const filters = {
    crop: params.get('crop') ?? '',
    category: params.get('category') ?? '',
    county: params.get('county') ?? '',
    grade: params.get('grade') ?? '',
    sort: params.get('sort') ?? 'fresh',
  }

  const active = ['crop', 'category', 'county', 'grade'].filter((key) => filters[key])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    // Choosing a specific crop makes its category redundant.
    if (key === 'crop' && value) next.delete('category')
    setParams(next, { replace: true })
  }

  const results = useMemo(() => {
    const matched = listings.filter(
      (listing) =>
        (!filters.crop || listing.crop === filters.crop) &&
        (!filters.category || listing.category === filters.category) &&
        (!filters.county || listing.county === filters.county) &&
        (!filters.grade || listing.grade === filters.grade),
    )
    return [...matched].sort(SORTS[filters.sort]?.compare ?? SORTS.fresh.compare)
  }, [listings, filters.crop, filters.category, filters.county, filters.grade, filters.sort])

  const totalKg = results.reduce((sum, listing) => sum + listing.totalKg, 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <PageHeader
        eyebrow={loading ? 'Loading open lots…' : `${number(listings.length)} lots open`}
        title="Market"
        description="Every lot here is posted by the farmer who grew it. Prices are per unit at the farm gate; the 6% platform fee is added at checkout."
        actions={
          <Button to="/new" icon="plus">
            Post a harvest
          </Button>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <div className="min-w-0">
          {/* Filters in one row above the results, collapsing to a 2-up grid. */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-44">
              <span className="eyebrow text-fg-3">Crop</span>
              <Select value={filters.crop} onChange={(e) => setFilter('crop', e.target.value)}>
                <option value="">Any crop</option>
                {CROPS.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-40">
              <span className="eyebrow text-fg-3">Category</span>
              <Select
                value={filters.category}
                disabled={Boolean(filters.crop)}
                onChange={(e) => setFilter('category', e.target.value)}
              >
                <option value="">Any category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-40">
              <span className="eyebrow text-fg-3">County</span>
              <Select value={filters.county} onChange={(e) => setFilter('county', e.target.value)}>
                <option value="">Anywhere</option>
                {COUNTIES.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-36">
              <span className="eyebrow text-fg-3">Grade</span>
              <Select value={filters.grade} onChange={(e) => setFilter('grade', e.target.value)}>
                <option value="">Any grade</option>
                {GRADES.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid min-w-[9rem] flex-1 gap-1.5 sm:max-w-44">
              <span className="eyebrow text-fg-3">Sort</span>
              <Select value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
                {Object.entries(SORTS).map(([id, sort]) => (
                  <option key={id} value={id}>
                    {sort.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
            <p className="text-sm text-fg-2">
              {loading ? (
                'Reading the open lots…'
              ) : (
                <>
                  <span className="tnum font-mono font-semibold text-fg">{results.length}</span>{' '}
                  {results.length === 1 ? 'lot' : 'lots'}
                  {totalKg > 0 ? (
                    <>
                      {' · '}
                      <span className="tnum font-mono">{weight(totalKg)}</span> available
                    </>
                  ) : null}
                </>
              )}
            </p>
            {active.length > 0 ? (
              <Button variant="ghost" size="sm" icon="close" onClick={() => setParams({}, { replace: true })}>
                Clear {active.length} {active.length === 1 ? 'filter' : 'filters'}
              </Button>
            ) : null}
          </div>

          {error ? (
            <ErrorState
              className="mt-6"
              title="The lots didn’t load"
              detail={error}
              onRetry={reload}
            />
          ) : loading ? (
            <div
              className="mt-6 grid gap-3 sm:grid-cols-2"
              role="status"
              aria-label="Loading open lots"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <ListingSkeleton key={index} />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {results.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : active.length > 0 ? (
            <EmptyState
              className="mt-6"
              title="No lots match that yet"
              body="Nothing open with those filters right now. Widen the county or check the board for what is trading today."
              action={{ label: 'Clear filters', onClick: () => setParams({}, { replace: true }) }}
            />
          ) : (
            // Nothing filtered and still nothing here: offering to clear filters
            // would be an action that does nothing, so the invitation is to post.
            <EmptyState
              className="mt-6"
              icon="sprout"
              title="Nothing is open right now"
              body="Every lot on MkulimaLink is posted by the farmer who grew it. Be the first one today."
              action={{ label: 'Post a harvest', to: '/new' }}
            />
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <PriceBoard animate={false} />
        </aside>
      </div>
    </div>
  )
}
