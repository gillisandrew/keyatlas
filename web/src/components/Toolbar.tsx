import { Printer } from 'lucide-react'
import { useHiddenEntries } from '@/context/HiddenEntriesContext'

export function Toolbar({
  slug,
  collapsed,
  onToggleCollapsed,
}: {
  slug: string
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const { resetSlug, hiddenCount } = useHiddenEntries()
  const count = hiddenCount(slug)

  return (
    <div className="toolbar mb-4 flex items-center gap-3 print:hidden">
      {count > 0 && (
        <>
          <button
            onClick={onToggleCollapsed}
            className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            {collapsed ? `Show ${count} hidden` : 'Collapse hidden'}
          </button>
          <button
            onClick={() => resetSlug(slug)}
            className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
        </>
      )}
      <button
        onClick={() => window.print()}
        className="ml-auto rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
      >
        <Printer size={14} className="mr-1 inline" />
        Print
      </button>
    </div>
  )
}
