import type { Cheatsheet } from '@/data/types'
import { EntryRow } from './EntryRow'

export function CheatsheetView({
  cheatsheet,
  slug,
  collapsed,
}: {
  cheatsheet: Cheatsheet
  slug: string
  collapsed: boolean
}) {
  const color = cheatsheet.color ?? '#4a90d9'
  const columns = cheatsheet.columns ?? 3

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{cheatsheet.app}</h1>
        {cheatsheet.subtitle && (
          <p className="mt-1 text-sm text-gray-500">{cheatsheet.subtitle}</p>
        )}
      </div>
      <div className="cheatsheet-columns gap-6" style={{ columnCount: columns }}>
        {cheatsheet.sections.map((section, si) => (
          <div key={si} className="mb-4 break-inside-avoid">
            <h3
              className="mb-2 border-b-2 pb-1 text-sm font-semibold uppercase tracking-wide"
              style={{ borderColor: color, color }}
            >
              {section.name}
            </h3>
            <div className="divide-y divide-gray-100">
              {section.entries.map((entry, ei) => (
                <EntryRow
                  key={ei}
                  entry={entry}
                  entryId={`${si}-${ei}`}
                  slug={slug}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
