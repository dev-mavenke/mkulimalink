import { Link } from 'react-router-dom'
import { longDate, money, moneyCompact, monthName, number, percent, weight } from '@/lib/format'
import { useMarket } from '@/context/marketContext'
import { PriceBoard } from '@/components/PriceBoard'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/Icon'

/**
 * The pitch is one number: what you get versus what the broker offers. So the
 * board is the hero — real prices, today's date, no photograph of a field.
 */

const STEPS = [
  {
    title: 'Post what you have',
    body: 'Crop, grade, how many units, and the day it can leave your farm. Takes about a minute.',
    detail: 'No listing fee',
  },
  {
    title: 'Buyers bid against the board',
    body: 'Verified buyers see your lot within minutes. They bid at or above today’s board price.',
    detail: 'Usually within 4 hours',
  },
  {
    title: 'Paid on collection',
    body: 'The buyer’s transport arrives, both sides confirm the weight, and M-Pesa settles the same day.',
    detail: 'Same-day M-Pesa',
  },
]

const BUYER_POINTS = [
  {
    icon: 'scale',
    title: 'Graded before it ships',
    body: 'Every lot carries a grade and a weight confirmed at collection, so what arrives is what you ordered.',
  },
  {
    icon: 'truck',
    title: 'Consolidate across farms',
    body: 'Combine lots from neighbouring farms in one county into a single pickup and one invoice.',
  },
  {
    icon: 'shield',
    title: 'Money held until weigh-in',
    body: 'Your payment releases when both sides sign off the weight. Short delivery, short payment.',
  },
]

export function Landing() {
  const { boardRows, boardDate, boardSummary } = useMarket()

  /**
   * The best-paying row on the board today, named in the closing line. Undefined
   * until the board arrives, so the sentence that uses it is conditional — a
   * headline with a blank price in it is worse than no headline.
   */
  const topRow = [...boardRows].sort((a, b) => b.price - a.price)[0]

  return (
    <>
      {/* ---- Hero: the board is the argument ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
          <div className="animate-fade-up">
            <p className="eyebrow text-fg-3">
              <span className="mr-2 inline-block size-1.5 translate-y-px rounded-full bg-up" />
              {boardDate ? `Board posted ${longDate(boardDate)}` : 'Reading today’s board'}
            </p>

            {/*
              Sized fluidly rather than by breakpoint: the second line is the
              widest thing on the page, and a step change at `lg` reflowed it to
              four lines in the 1024–1280 band. 4.4vw keeps it to two lines from
              768 up; below that it wraps to three, which is the intended
              mobile rag.
            */}
            <h1 className="masthead mt-5 text-[clamp(2.25rem,4.4vw,3.5rem)] text-fg">
              Sell your harvest
              <br />
              at today&rsquo;s
              <span className="relative ml-3 inline-block">
                <span className="relative z-10">real price</span>
                <span
                  className="absolute inset-x-0 bottom-1 z-0 h-3 bg-marigold sm:bottom-2 sm:h-4"
                  aria-hidden="true"
                />
              </span>
              .
            </h1>

            <p className="mt-6 max-w-lg text-base text-fg-2 sm:text-lg">
              The broker at your gate knows the market price. Now you do too. MkulimaLink posts what
              buyers in Nairobi are paying every morning, and links you straight to them.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button to="/new" size="lg" icon="sprout">
                Post a harvest
              </Button>
              <Button to="/market" size="lg" variant="secondary" iconAfter="arrowRight">
                Browse open lots
              </Button>
            </div>

            {/*
              Subgrid, so the three figures share one baseline even when a label
              wraps to two lines at narrow widths. Without it the longest label
              pushes its own number down and the row reads as a mistake.
            */}
            <dl className="mt-10 grid max-w-xl grid-cols-3 grid-rows-[auto_auto] gap-x-4 border-t border-rule pt-6">
              {[
                { label: 'Farmers selling', value: number(boardSummary.farmers) },
                { label: 'Verified buyers', value: number(boardSummary.buyers) },
                {
                  // Named rather than hardcoded: "Paid out in August" is only
                  // true in August, and a stale month makes the figure look
                  // stale with it.
                  label: `Paid out in ${monthName()}`,
                  value: moneyCompact(boardSummary.paidOutThisMonth),
                },
              ].map((stat) => (
                <div key={stat.label} className="row-span-2 grid grid-rows-subgrid">
                  <dt className="eyebrow text-fg-3">{stat.label}</dt>
                  <dd className="tnum mt-1.5 self-end font-mono text-lg font-semibold text-fg">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <PriceBoard limit={7} className="shadow-lift lg:sticky lg:top-24" />
        </div>
      </section>

      {/* ---- How it works: a real sequence, so it gets numbered ----------- */}
      <section id="how" className="border-y border-rule bg-surface-2 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="eyebrow text-fg-3">How a lot moves</p>
            <h2 className="masthead mt-3 text-[2rem] text-fg sm:text-[2.5rem]">
              Three steps, one day
            </h2>
          </div>

          <ol className="mt-10 grid gap-px overflow-hidden rounded-panel border border-rule bg-rule sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="bg-surface p-6">
                <div className="flex items-baseline gap-3">
                  <span className="tnum font-mono text-sm font-semibold text-brand">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-base font-semibold text-fg">{step.title}</h3>
                </div>
                <p className="mt-3 text-sm text-fg-2">{step.body}</p>
                <p className="eyebrow mt-4 inline-block rounded-full bg-brand-wash px-2 py-1 text-brand">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-6 flex items-start gap-2 text-xs text-fg-3">
            <Icon name="info" className="mt-px shrink-0 text-sm" />
            Buyers pay a 6% platform fee on top of the board price. Nothing is deducted from what
            you are quoted.
          </p>
        </div>
      </section>

      {/* ---- Buyers ------------------------------------------------------ */}
      <section id="buyers" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="eyebrow text-fg-3">For buyers</p>
            <h2 className="masthead mt-3 text-[2rem] text-fg sm:text-[2.5rem]">
              Buy volume without the middle
            </h2>
            <p className="mt-5 text-base text-fg-2">
              Hotels, schools, grocers and aggregators source{' '}
              <span className="tnum font-mono font-semibold text-fg">
                {weight(boardSummary.volumeKgToday)}
              </span>{' '}
              a day through MkulimaLink. You see the farm, the grade and the collection window
              before you commit.
            </p>
            <Button to="/market" variant="secondary" className="mt-7" iconAfter="arrowRight">
              See what&rsquo;s open today
            </Button>
          </div>

          <ul className="grid gap-3">
            {BUYER_POINTS.map((point) => (
              <li key={point.title} className="panel flex gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-field bg-brand-wash text-brand">
                  <Icon name={point.icon} className="text-xl" />
                </span>
                <div>
                  <h3 className="text-[0.9375rem] font-semibold text-fg">{point.title}</h3>
                  <p className="mt-1.5 text-sm text-fg-2">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Closing ----------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="board-panel grid gap-6 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-marigold">Start today</p>
            <h2 className="masthead mt-3 text-[1.875rem] text-board-fg sm:text-[2.25rem]">
              {boardSummary.averageUplift > 0
                ? `Your next harvest is worth ${percent(boardSummary.averageUplift)} more`
                : 'Your next harvest is worth more than the gate price'}
            </h2>
            <p className="mt-4 max-w-md text-sm text-board-fg-2">
              That is the average gap between the board and the broker across every crop we quote.
              Post a lot and see what a buyer offers before you accept anything at the gate.
            </p>
          </div>

          <div className="grid gap-3 sm:max-w-xs">
            <Button to="/new" size="lg" fullWidth icon="sprout">
              Post a harvest
            </Button>
            <Button to="/signin" size="lg" variant="board" fullWidth>
              I already have an account
            </Button>
            <p className="text-center text-xs text-board-fg-3">
              Free for farmers.
              {topRow ? (
                <>
                  {' '}
                  Best price on the board today:{' '}
                  <Link
                    to={`/market?crop=${topRow.id}`}
                    className="font-mono text-marigold hover:underline"
                  >
                    {money(topRow.price)}
                  </Link>{' '}
                  a {topRow.unit} of {topRow.crop.toLowerCase()}.
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
