import { Link } from 'react-router-dom'
import { Logo } from '@/components/Icon'
import { REFERENCE_MARKETS } from '@/data/catalog'

const COLUMNS = [
  {
    heading: 'Sell',
    links: [
      { to: '/new', label: 'Post a harvest' },
      { to: '/dashboard', label: 'My lots' },
      { to: '/market', label: 'Today’s board' },
    ],
  },
  {
    heading: 'Buy',
    links: [
      { to: '/market', label: 'Open lots' },
      { to: '/#buyers', label: 'Bulk sourcing' },
      { to: '/#how', label: 'How settlement works' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule bg-surface-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-fg-2">
            Farm-gate prices, posted daily. Built in Nairobi for the people who grow the food.
          </p>
          <p className="eyebrow mt-5 text-fg-3">
            Board reference:{' '}
            {REFERENCE_MARKETS.map((market) => market.name).join(' · ')}
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="eyebrow text-fg-3">{column.heading}</h2>
            <ul className="mt-3 grid gap-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-fg-2 hover:text-fg hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-fg-3 sm:px-6">
          <p>© {new Date().getFullYear()} MkulimaLink. Prices are indicative until a buyer confirms.</p>
          <p className="font-mono">Nairobi, Kenya</p>
        </div>
      </div>
    </footer>
  )
}
