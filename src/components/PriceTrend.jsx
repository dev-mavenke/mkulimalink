import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { money, shortDate } from '@/lib/format'
import { Delta } from '@/components/ui/Badge'

const VIEW = { width: 640, height: 176 }
const PAD = { top: 18, right: 16, bottom: 26, left: 16 }
const PLOT = {
  width: VIEW.width - PAD.left - PAD.right,
  height: VIEW.height - PAD.top - PAD.bottom,
}

/**
 * Fourteen days of one crop's farm-gate price.
 *
 * One series, so no legend — the heading names it. One y-axis, three recessive
 * gridlines, and direct labels only on the first and last points; the rest of
 * the values live in the hover tooltip and in the table underneath, which is
 * how a screen reader reads this chart.
 */
export function PriceTrend({ crop, history, change, className }) {
  const [active, setActive] = useState(null)
  const svgRef = useRef(null)

  const { path, points, ticks, low, high } = useMemo(() => {
    const prices = history.map((point) => point.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    // Pad the domain so a flat series doesn't collapse onto the axis.
    const span = max - min || Math.max(max * 0.04, 1)
    const domain = { min: min - span * 0.35, max: max + span * 0.35 }

    const x = (index) => PAD.left + (index / (history.length - 1)) * PLOT.width
    const y = (price) =>
      PAD.top + (1 - (price - domain.min) / (domain.max - domain.min)) * PLOT.height

    const mapped = history.map((point, index) => ({ ...point, x: x(index), y: y(point.price) }))

    return {
      points: mapped,
      path: mapped.map((point, i) => `${i ? 'L' : 'M'}${point.x} ${point.y}`).join(' '),
      ticks: [0, 0.5, 1].map((fraction) => PAD.top + PLOT.height * fraction),
      low: min,
      high: max,
    }
  }, [history])

  const last = points.at(-1)
  const hovered = active === null ? null : points[active]

  const onPointerMove = useCallback(
    (event) => {
      const box = svgRef.current?.getBoundingClientRect()
      if (!box) return
      const ratio = (event.clientX - box.left) / box.width
      const position = (ratio * VIEW.width - PAD.left) / PLOT.width
      const index = Math.round(position * (points.length - 1))
      setActive(Math.min(Math.max(index, 0), points.length - 1))
    },
    [points.length],
  )

  return (
    <figure className={cn('grid gap-2', className)}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">{crop}</h3>
          <p className="eyebrow mt-1 text-fg-3">14-day farm-gate price</p>
        </div>
        <div className="text-right">
          <p className="tnum font-mono text-lg font-semibold text-fg">{money(last.price)}</p>
          <Delta value={change} className="justify-end" />
        </div>
      </figcaption>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`${crop}: ${money(history[0].price)} on ${shortDate(history[0].date)} rising and falling to ${money(last.price)} today. Low ${money(low)}, high ${money(high)}.`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        >
          {/* Transparent capture area: an SVG only receives pointer events on
              painted geometry, and a 2px line is a hopeless hit target. */}
          <rect x="0" y="0" width={VIEW.width} height={VIEW.height} fill="transparent" />

          {ticks.map((y, index) => (
            <line
              key={index}
              x1={PAD.left}
              x2={PAD.left + PLOT.width}
              y1={y}
              y2={y}
              className="stroke-rule"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {hovered ? (
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD.top - 6}
              y2={PAD.top + PLOT.height + 6}
              className="stroke-fg-3"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          <path
            d={path}
            fill="none"
            className="stroke-brand"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Today's reading gets a permanent marker; a 2px surface ring keeps it
              legible where it crosses the line. */}
          <circle cx={last.x} cy={last.y} r="5" className="fill-brand stroke-surface-3" strokeWidth="2" />

          {hovered && hovered !== last ? (
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r="4.5"
              className="fill-brand stroke-surface-3"
              strokeWidth="2"
            />
          ) : null}

          <text
            x={PAD.left}
            y={VIEW.height - 8}
            className="fill-fg-3 font-mono text-[11px]"
          >
            {shortDate(history[0].date)}
          </text>
          <text
            x={PAD.left + PLOT.width}
            y={VIEW.height - 8}
            textAnchor="end"
            className="fill-fg-3 font-mono text-[11px]"
          >
            Today
          </text>
        </svg>

        {hovered ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-field border border-rule bg-surface-3 px-2 py-1 shadow-pop"
            style={{
              left: `${(hovered.x / VIEW.width) * 100}%`,
              top: `${(hovered.y / VIEW.height) * 100}%`,
            }}
          >
            <p className="tnum font-mono text-xs font-semibold whitespace-nowrap text-fg">
              {money(hovered.price)}
            </p>
            <p className="eyebrow whitespace-nowrap text-fg-3">{shortDate(hovered.date)}</p>
          </div>
        ) : null}
      </div>

      {/* The same data, for anyone who can't read the plot. */}
      <table className="sr-only">
        <caption>{crop} farm-gate price, last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {history.map((point) => (
            <tr key={point.date.toISOString()}>
              <th scope="row">{shortDate(point.date)}</th>
              <td>{money(point.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
