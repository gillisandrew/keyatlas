import { useCallback, useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getCheatsheet } from '@/data/cheatsheets'
import { AppSidebar } from '@/components/AppSidebar'
import { CheatsheetView } from '@/components/CheatsheetView'
import { Toolbar } from '@/components/Toolbar'
import { YamlModal } from '@/components/YamlModal'

export type FontSize = 'sm' | 'md' | 'lg'

/** sectionIndex -> columnIndex */
export type LayoutOverrides = Record<number, number>

export const Route = createFileRoute('/$appSlug')({
  component: CheatsheetPage,
  loader: ({ params }) => {
    const cheatsheet = getCheatsheet(params.appSlug)
    if (!cheatsheet) throw notFound()
    return { cheatsheet }
  },
})

const LAYOUT_KEY = 'keyatlas:layout'
const FONT_KEY = 'keyatlas:font-scale'
const COLUMNS_KEY = 'keyatlas:columns'

function getStoredMap<T>(key: string, slug: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const map = JSON.parse(raw)
      return map[slug] as T
    }
  } catch {}
  return undefined
}

function storeMapValue<T>(key: string, slug: string, value: T) {
  try {
    const raw = localStorage.getItem(key)
    const map = raw ? JSON.parse(raw) : {}
    map[slug] = value
    localStorage.setItem(key, JSON.stringify(map))
  } catch {}
}

function deleteMapValue(key: string, slug: string) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const map = JSON.parse(raw)
      delete map[slug]
      localStorage.setItem(key, JSON.stringify(map))
    }
  } catch {}
}

function CheatsheetPage() {
  const { cheatsheet } = Route.useLoaderData()
  const defaultColumns = cheatsheet.columns ?? 3
  const [collapsed, setCollapsed] = useState(false)
  const [fontSize, setFontSize] = useState<FontSize>(
    () => getStoredMap<FontSize>(FONT_KEY, cheatsheet.slug) ?? 'md',
  )
  const [columnCount, setColumnCount] = useState(
    () => getStoredMap<number>(COLUMNS_KEY, cheatsheet.slug) ?? defaultColumns,
  )
  const [layoutOverrides, setLayoutOverrides] = useState<LayoutOverrides>(
    () => getStoredMap<LayoutOverrides>(LAYOUT_KEY, cheatsheet.slug) ?? {},
  )
  const [showYaml, setShowYaml] = useState(false)

  const hasLayoutOverrides = Object.keys(layoutOverrides).length > 0

  function handleFontSizeChange(size: FontSize) {
    setFontSize(size)
    storeMapValue(FONT_KEY, cheatsheet.slug, size)
  }

  function handleColumnCountChange(count: number) {
    const clamped = Math.max(1, Math.min(6, count))
    setColumnCount(clamped)
    storeMapValue(COLUMNS_KEY, cheatsheet.slug, clamped)
    // Clear layout overrides when column count changes
    setLayoutOverrides({})
    deleteMapValue(LAYOUT_KEY, cheatsheet.slug)
  }

  const handleLayoutChange = useCallback(
    (overrides: LayoutOverrides) => {
      setLayoutOverrides(overrides)
      if (Object.keys(overrides).length > 0) {
        storeMapValue(LAYOUT_KEY, cheatsheet.slug, overrides)
      } else {
        deleteMapValue(LAYOUT_KEY, cheatsheet.slug)
      }
    },
    [cheatsheet.slug],
  )

  function handleResetLayout() {
    setLayoutOverrides({})
    deleteMapValue(LAYOUT_KEY, cheatsheet.slug)
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-8">
        <Toolbar
          slug={cheatsheet.slug}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          columnCount={columnCount}
          onColumnCountChange={handleColumnCountChange}
          hasLayoutOverrides={hasLayoutOverrides}
          onResetLayout={handleResetLayout}
          onViewYaml={() => setShowYaml(true)}
        />
        <CheatsheetView
          cheatsheet={cheatsheet}
          slug={cheatsheet.slug}
          collapsed={collapsed}
          fontSize={fontSize}
          columnCount={columnCount}
          layoutOverrides={layoutOverrides}
          onLayoutChange={handleLayoutChange}
        />
      </main>
      {showYaml && (
        <YamlModal cheatsheet={cheatsheet} onClose={() => setShowYaml(false)} />
      )}
    </div>
  )
}
