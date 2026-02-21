import { Code, Columns3, Minus, Plus, Printer, Search } from 'lucide-react'
import { useHiddenEntries } from '@/context/HiddenEntriesContext'
import type { FontSize } from '@/routes/$appSlug'

const fontSizeLabels: Record<FontSize, string> = {
  sm: 'S',
  md: 'M',
  lg: 'L',
}

const fontSizeCycle: FontSize[] = ['sm', 'md', 'lg']

export function Toolbar({
  slug,
  collapsed,
  onToggleCollapsed,
  fontSize,
  onFontSizeChange,
  columnCount,
  onColumnCountChange,
  hasLayoutOverrides,
  onResetLayout,
  onViewYaml,
  searchQuery = '',
  onSearchChange,
}: {
  slug: string
  collapsed: boolean
  onToggleCollapsed: () => void
  fontSize: FontSize
  onFontSizeChange: (size: FontSize) => void
  columnCount: number
  onColumnCountChange: (count: number) => void
  hasLayoutOverrides: boolean
  onResetLayout: () => void
  onViewYaml: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
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

      <div className="ml-auto flex items-center gap-2">
        {onSearchChange && (
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-44 rounded border border-gray-200 py-1 pl-8 pr-3 text-xs text-gray-700 placeholder-gray-400 focus:border-gray-300 focus:outline-none"
            />
          </div>
        )}
        <div className="flex items-center gap-1 rounded border border-gray-200 px-1 py-0.5">
          <Columns3 size={14} className="text-gray-400" />
          <button
            onClick={() => onColumnCountChange(columnCount - 1)}
            disabled={columnCount <= 1}
            className="px-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
            title="Fewer columns"
          >
            <Minus size={12} />
          </button>
          <span className="min-w-[1ch] text-center text-xs font-medium text-gray-700">{columnCount}</span>
          <button
            onClick={() => onColumnCountChange(columnCount + 1)}
            disabled={columnCount >= 6}
            className="px-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
            title="More columns"
          >
            <Plus size={12} />
          </button>
        </div>

        {hasLayoutOverrides && (
          <button
            onClick={onResetLayout}
            className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Reset layout
          </button>
        )}

        <div className="flex items-center rounded border border-gray-200">
          {fontSizeCycle.map((size) => (
            <button
              key={size}
              onClick={() => onFontSizeChange(size)}
              className={`px-2 py-1 text-xs ${
                fontSize === size
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
              title={`Font size: ${size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}`}
            >
              {fontSizeLabels[size]}
            </button>
          ))}
        </div>

        <button
          onClick={onViewYaml}
          className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Code size={14} className="mr-1 inline" />
          YAML
        </button>

        <button
          onClick={() => window.print()}
          className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Printer size={14} className="mr-1 inline" />
          Print
        </button>
      </div>
    </div>
  )
}
