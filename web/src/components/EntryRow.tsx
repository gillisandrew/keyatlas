import { Eye, EyeOff } from 'lucide-react'
import type { Entry } from '@/data/types'
import { KeyCombo } from './KeyCombo'
import { useHiddenEntries } from '@/context/HiddenEntriesContext'

export function EntryRow({
  entry,
  entryId,
  slug,
  collapsed,
}: {
  entry: Entry
  entryId: string
  slug: string
  collapsed: boolean
}) {
  const { isHidden, toggle } = useHiddenEntries()
  const hidden = isHidden(slug, entryId)

  if (hidden && collapsed) return null

  return (
    <div
      className={`entry-row flex items-center justify-between gap-4 py-1.5 ${
        hidden ? 'opacity-40 line-through' : ''
      }`}
    >
      <span className="shrink-0">
        <KeyCombo keys={entry.keys} range={entry.range} altKeys={entry.alt_keys} />
      </span>
      <span className="flex items-center gap-2 text-sm text-gray-600">
        {entry.action}
        <button
          onClick={() => toggle(slug, entryId)}
          className="toggle-btn ml-1 text-gray-300 hover:text-gray-500 print:hidden"
          title={hidden ? 'Show' : 'Hide'}
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </span>
    </div>
  )
}
