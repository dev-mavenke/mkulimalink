import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-24 text-center sm:px-6">
      <p className="eyebrow text-fg-3">Error 404</p>
      <h1 className="masthead mt-4 text-[2.5rem] text-fg sm:text-[3rem]">
        Nothing is posted here
      </h1>
      <p className="mt-4 text-base text-fg-2">
        This page doesn&rsquo;t exist, or the lot it pointed to has already been collected.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/market" size="lg" icon="board">
          Today&rsquo;s board
        </Button>
        <Button to="/" size="lg" variant="secondary">
          Back to the start
        </Button>
      </div>
      <p className="mt-8 text-xs text-fg-3">
        Looking for a lot you saved?{' '}
        <Link to="/dashboard" className="font-semibold text-brand hover:underline">
          Check your lots
        </Link>
        .
      </p>
    </div>
  )
}
