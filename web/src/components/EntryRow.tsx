import { Eye, EyeOff } from 'lucide-react'
import type { Entry } from '@/data/types'
import { KeyCombo } from './KeyCombo'
import { useHiddenEntries } from '@/context/HiddenEntriesContext'

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)

  if (idx === -1) return <>{text}</>

  return (
    <>{text.slice(0, idx)}<mark className="bg-yellow-200">{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>
  )
}

export function EntryRow({
  entry,
  entryId,
  slug,
  collapsed,
  searchQuery,
}: {
  entry: Entry
  entryId: string
  slug: string
  collapsed: boolean
  searchQuery?: string
}) {
  const { isHidden, toggle } = useHiddenEntries()
  const hidden = isHidden(slug, entryId)

  if (hidden && collapsed) return null

  const matches = !searchQuery || entry.action.toLowerCase().includes(searchQuery.toLowerCase())
  const dimmed = searchQuery && !matches

  return (
    <div
      className={`entry-row flex items-center justify-between gap-4 py-1.5 ${
        hidden ? 'opacity-40 line-through' : ''
      } ${dimmed ? 'opacity-20' : ''}`}
    >
      <span className="shrink-0">
        <KeyCombo keys={entry.keys} range={entry.range} altKeys={entry.alt_keys} />
      </span>
      <span className="flex items-center gap-2 text-gray-600 text-right">
        <span className="text-right"><HighlightedText text={entry.action} query={searchQuery ?? ''} /></span>
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
