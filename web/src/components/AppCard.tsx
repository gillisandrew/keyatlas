import { Link } from '@tanstack/react-router'
import type { Cheatsheet } from '@/data/types'

export function AppCard({ cheatsheet }: { cheatsheet: Cheatsheet }) {
  const color = cheatsheet.color ?? '#4a90d9'
  const entryCount = cheatsheet.sections.reduce((n, s) => n + s.entries.length, 0)

  return (
    <Link
      to="/$appSlug"
      params={{ appSlug: cheatsheet.slug }}
      className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <div className="mb-3 h-1 w-12 rounded-full" style={{ backgroundColor: color }} />
      <h2 className="text-lg font-semibold text-gray-900 group-hover:underline">
        {cheatsheet.app}
      </h2>
      {cheatsheet.subtitle && (
        <p className="mt-1 text-sm text-gray-500">{cheatsheet.subtitle}</p>
      )}
      <p className="mt-3 text-xs text-gray-400">
        {cheatsheet.sections.length} sections · {entryCount} shortcuts
      </p>
    </Link>
  )
}
