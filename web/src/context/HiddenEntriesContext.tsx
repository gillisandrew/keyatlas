import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'keyatlas:hidden'

type HiddenMap = Record<string, string[]>

let cachedRaw: string | null = null
let cachedData: HiddenMap = {}

function getSnapshot(): HiddenMap {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cachedData = raw ? JSON.parse(raw) : {}
    } catch {
      cachedData = {}
    }
  }
  return cachedData
}

const serverSnapshot: HiddenMap = {}

function writeStorage(data: HiddenMap) {
  const json = JSON.stringify(data)
  cachedRaw = json
  cachedData = data
  localStorage.setItem(STORAGE_KEY, json)
  window.dispatchEvent(new Event('keyatlas-hidden-change'))
}

interface HiddenEntriesContextValue {
  isHidden: (slug: string, entryId: string) => boolean
  toggle: (slug: string, entryId: string) => void
  resetSlug: (slug: string) => void
  hiddenCount: (slug: string) => number
}

const HiddenEntriesContext = createContext<HiddenEntriesContextValue | null>(null)

export function HiddenEntriesProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(
    (cb) => {
      window.addEventListener('keyatlas-hidden-change', cb)
      window.addEventListener('storage', cb)
      return () => {
        window.removeEventListener('keyatlas-hidden-change', cb)
        window.removeEventListener('storage', cb)
      }
    },
    getSnapshot,
    () => serverSnapshot,
  )

  const isHidden = useCallback(
    (slug: string, entryId: string) => (data[slug] ?? []).includes(entryId),
    [data],
  )

  const toggle = useCallback((slug: string, entryId: string) => {
    const current = { ...getSnapshot() }
    const list = current[slug] ?? []
    if (list.includes(entryId)) {
      current[slug] = list.filter((id) => id !== entryId)
    } else {
      current[slug] = [...list, entryId]
    }
    writeStorage(current)
  }, [])

  const resetSlug = useCallback((slug: string) => {
    const current = { ...getSnapshot() }
    delete current[slug]
    writeStorage(current)
  }, [])

  const hiddenCount = useCallback(
    (slug: string) => (data[slug] ?? []).length,
    [data],
  )

  const value = useMemo(
    () => ({ isHidden, toggle, resetSlug, hiddenCount }),
    [isHidden, toggle, resetSlug, hiddenCount],
  )

  return (
    <HiddenEntriesContext.Provider value={value}>
      {children}
    </HiddenEntriesContext.Provider>
  )
}

export function useHiddenEntries() {
  const ctx = useContext(HiddenEntriesContext)
  if (!ctx) throw new Error('useHiddenEntries must be used within HiddenEntriesProvider')
  return ctx
}
