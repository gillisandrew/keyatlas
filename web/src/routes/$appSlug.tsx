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

/** sectionIndex -> custom heading name */
export type HeadingOverrides = Record<number, string>

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
const SIDEBAR_KEY = 'keyatlas:sidebar-open'
const HEADINGS_KEY = 'keyatlas:headings'

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
  const [headingOverrides, setHeadingOverrides] = useState<HeadingOverrides>(
    () => getStoredMap<HeadingOverrides>(HEADINGS_KEY, cheatsheet.slug) ?? {},
  )
  const [showYaml, setShowYaml] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_KEY)
      return v === null ? true : v === 'true'
    } catch {
      return true
    }
  })

  const hasLayoutOverrides = Object.keys(layoutOverrides).length > 0

  function handleSidebarToggle() {
    setSidebarOpen((prev) => {
      const next = !prev
      try { localStorage.setItem(SIDEBAR_KEY, String(next)) } catch {}
      return next
    })
  }

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

  const handleHeadingChange = useCallback(
    (sectionIndex: number, name: string) => {
      setHeadingOverrides((prev) => {
        const next = { ...prev }
        // If name matches original, remove the override
        if (name === cheatsheet.sections[sectionIndex]?.name) {
          delete next[sectionIndex]
        } else {
          next[sectionIndex] = name
        }
        if (Object.keys(next).length > 0) {
          storeMapValue(HEADINGS_KEY, cheatsheet.slug, next)
        } else {
          deleteMapValue(HEADINGS_KEY, cheatsheet.slug)
        }
        return next
      })
    },
    [cheatsheet.slug, cheatsheet.sections],
  )

  function handleResetLayout() {
    setLayoutOverrides({})
    deleteMapValue(LAYOUT_KEY, cheatsheet.slug)
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
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
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <CheatsheetView
          cheatsheet={cheatsheet}
          slug={cheatsheet.slug}
          collapsed={collapsed}
          fontSize={fontSize}
          columnCount={columnCount}
          layoutOverrides={layoutOverrides}
          onLayoutChange={handleLayoutChange}
          searchQuery={searchQuery}
          headingOverrides={headingOverrides}
          onHeadingChange={handleHeadingChange}
        />
      </main>
      {showYaml && (
        <YamlModal cheatsheet={cheatsheet} onClose={() => setShowYaml(false)} />
      )}
    </div>
  )
}
