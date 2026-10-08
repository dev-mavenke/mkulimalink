import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { number, shortDate } from '@/lib/format'

const VIEW = { width: 640, height: 152 }
const PAD = { top: 22, right: 8, bottom: 24, left: 8 }
const PLOT = {
  width: VIEW.width - PAD.left - PAD.right,
  height: VIEW.height - PAD.top - PAD.bottom,
}
const MAX_BAR = 18

function barPath(x, y, width, height) {
  const radius = Math.min(4, height, width / 2)
  return [
    `M${x},${y + height}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + width - radius},${y}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `L${x + width},${y + height}`,
    'Z',
  ].join(' ')
}

function Tooltip({ x, y, children }) {
  return (
    <div
      className="pointer-events-none absolute rounded-field border border-rule bg-surface-3 px-2 py-1 shadow-pop"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(clamp(${-x}cqw, -50%, calc(${100 - x}cqw - 100%)), -100%)`,
      }}
    >
      {children}
    </div>
  )
}

export function SignupBars({ days = [], className }) {
  const [active, setActive] = useState(null)

  const chart = useMemo(() => {
    if (!days.length) return null
    const top = Math.max(...days.map((day) => day.total), 1)
    const slot = PLOT.width / days.length
    const width = Math.min(MAX_BAR, slot - 2)

    const bars = days.map((day, index) => {
      const height = (day.total / top) * PLOT.height
      return {
        ...day,
        index,
        slotX: PAD.left + slot * index,
        slotWidth: slot,
        x: PAD.left + slot * index + (slot - width) / 2,
        y: PAD.top + PLOT.height - height,
        width,
        height,
      }
    })

    return {
      bars,
      ceiling: top,
      busiest: bars.reduce((best, day) => (day.total > best.total ? day : best), bars[0]),
    }
  }, [days])

  if (!chart) {
    return <p className={cn('text-sm text-fg-3', className)}>No signups yet.</p>
  }

  const { bars, ceiling, busiest } = chart
  const today = bars.at(-1)
  const hovered = active === null ? null : bars[active]
  const total = days.reduce((sum, day) => sum + day.total, 0)
  const labelled = new Set([busiest.index, today.index])

  return (
    <figure className={cn('grid gap-2', className)}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">New accounts</h3>
          <p className="eyebrow mt-1 text-fg-3">Per day, last 14 days</p>
        </div>
        <p className="tnum font-mono text-lg font-semibold text-fg">{number(total)}</p>
      </figcaption>

      <div className="relative @container">
        <svg
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`${total} new accounts over 14 days, from ${shortDate(days[0].date)} to today. Busiest day ${shortDate(busiest.date)} with ${busiest.total}.`}
          onPointerLeave={() => setActive(null)}
        >
          <line
            x1={PAD.left}
            x2={PAD.left + PLOT.width}
            y1={PAD.top + PLOT.height}
            y2={PAD.top + PLOT.height}
            className="stroke-rule-strong"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {bars.map((bar) => (
            <g key={bar.date.toISOString()}>
              {bar.height > 0 ? (
                <path
                  d={barPath(bar.x, bar.y, bar.width, bar.height)}
                  className={cn(
                    'fill-brand transition-opacity',
                    hovered && hovered.index !== bar.index && 'opacity-45',
                  )}
                />
              ) : null}

              {labelled.has(bar.index) && bar.total > 0 ? (
                <text
                  x={bar.x + bar.width / 2}
                  y={bar.y - 7}
                  textAnchor="middle"
                  className="tnum fill-fg font-mono text-[11px] font-semibold"
                >
                  {bar.total}
                </text>
              ) : null}

              <rect
                x={bar.slotX}
                y={PAD.top}
                width={bar.slotWidth}
                height={PLOT.height}
                fill="transparent"
                onPointerEnter={() => setActive(bar.index)}
              />
            </g>
          ))}

          <text x={PAD.left} y={VIEW.height - 7} className="fill-fg-3 font-mono text-[11px]">
            {shortDate(days[0].date)}
          </text>
          <text
            x={PAD.left + PLOT.width}
            y={VIEW.height - 7}
            textAnchor="end"
            className="fill-fg-3 font-mono text-[11px]"
          >
            Today
          </text>
        </svg>

        {hovered ? (
          <Tooltip
            x={((hovered.slotX + hovered.slotWidth / 2) / VIEW.width) * 100}
            y={((hovered.total > 0 ? hovered.y : PAD.top + PLOT.height) / VIEW.height) * 100}
          >
            <p className="tnum font-mono text-xs font-semibold whitespace-nowrap text-fg">
              {shortDate(hovered.date)} ·{' '}
              {hovered.total === 1 ? '1 account' : `${hovered.total} accounts`}
            </p>
            <p className="eyebrow mt-0.5 whitespace-nowrap text-fg-3">
              {hovered.farmers} farmer{hovered.farmers === 1 ? '' : 's'}, {hovered.buyers} buyer
              {hovered.buyers === 1 ? '' : 's'}
            </p>
          </Tooltip>
        ) : null}
      </div>

      <p className="eyebrow text-fg-3">
        Scale tops out at {ceiling} {ceiling === 1 ? 'account' : 'accounts'}
      </p>

      <table className="sr-only">
        <caption>New accounts per day, last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Farmers</th>
            <th scope="col">Buyers</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date.toISOString()}>
              <th scope="row">{shortDate(day.date)}</th>
              <td>{day.farmers}</td>
              <td>{day.buyers}</td>
              <td>{day.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}