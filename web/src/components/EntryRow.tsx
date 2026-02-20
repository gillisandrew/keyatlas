import type { Entry } from '@/data/types'
import { KeyCombo } from './KeyCombo'

export function EntryRow({
  entry,
}: {
  entry: Entry
  entryId: string
}) {
  return (
    <div className="entry-row flex items-center justify-between gap-4 py-1.5">
      <span className="shrink-0">
        <KeyCombo keys={entry.keys} range={entry.range} altKeys={entry.alt_keys} />
      </span>
      <span className="text-sm text-gray-600">{entry.action}</span>
    </div>
  )
}
