# KeyAtlas Web App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a statically generated React web app for browsing keyboard shortcut cheatsheets, with hide/show toggles and print support, deployed to GitHub Pages.

**Architecture:** TanStack Start app in `web/` (already scaffolded) using Vite with a YAML plugin to import `../data/*.yaml` at build time. Static prerendering produces HTML for each route. Sidebar navigation on detail pages, card grid on landing page.

**Tech Stack:** TanStack Start, TanStack Router, React 19, Vite 7, Tailwind CSS v4, TypeScript, lucide-react (all already installed)

**Package manager:** pnpm (used throughout — never npm/npx)

**Working directory:** `.worktrees/feature-web-app/web/`

**Design doc:** `docs/plans/2026-02-20-web-app-design.md`

**Existing project conventions:**
- Source files live in `web/src/` (not `web/app/`)
- Path alias: `@/*` maps to `./src/*`
- Router config: `web/src/router.tsx` exports `getRouter()`
- Vite config: `web/vite.config.ts` (not `app.config.ts`)
- Root layout: `web/src/routes/__root.tsx` uses `shellComponent` pattern
- Styles: `web/src/styles.css` with `@import "tailwindcss"`
- File-based routing in `web/src/routes/`
- Components in `web/src/components/`

---

## Task 1: Install YAML plugin and clean up scaffolded demo content

**Files:**
- Modify: `web/package.json` (add `@modyfi/vite-plugin-yaml`)
- Modify: `web/vite.config.ts` (add yaml plugin)
- Modify: `web/src/routes/__root.tsx` (replace demo with KeyAtlas root layout)
- Modify: `web/src/routes/index.tsx` (clear demo content — placeholder for Task 3)
- Delete: `web/src/components/Header.tsx` (demo component)
- Create: `web/yaml.d.ts`

**Step 1: Install the YAML Vite plugin**

```bash
cd .worktrees/feature-web-app/web && pnpm add @modyfi/vite-plugin-yaml
```

**Step 2: Add yaml plugin to `web/vite.config.ts`**

Add the import and plugin. The existing plugins stay — just add `yaml()`:

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import yaml from '@modyfi/vite-plugin-yaml'

const config = defineConfig({
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    yaml(),
  ],
})

export default config
```

**Step 3: Create YAML type declaration `web/yaml.d.ts`**

```ts
declare module '*.yaml' {
  const data: Record<string, unknown>
  export default data
}
```

**Step 4: Replace `web/src/routes/__root.tsx`**

Remove the demo Header component and TanStack branding. Replace with a minimal KeyAtlas root layout:

```tsx
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'KeyAtlas' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

**Step 5: Clear `web/src/routes/index.tsx`**

Replace with a minimal placeholder:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">KeyAtlas</h1>
      <p className="text-gray-500">Coming soon</p>
    </div>
  )
}
```

**Step 6: Delete `web/src/components/Header.tsx`**

```bash
rm web/src/components/Header.tsx
```

**Step 7: Clean up demo public assets**

```bash
rm web/public/tanstack-circle-logo.png web/public/tanstack-word-logo-white.svg
```

**Step 8: Verify it runs**

```bash
cd web && pnpm dev
```

Open `http://localhost:3000/` — should see "KeyAtlas / Coming soon" with no errors.

**Step 9: Commit**

```bash
git add -A && git commit -m "feat(web): add YAML plugin and replace demo content with KeyAtlas shell"
```

---

## Task 2: Data layer — YAML imports and TypeScript types

**Files:**
- Create: `web/src/data/types.ts`
- Create: `web/src/data/cheatsheets.ts`

**Step 1: Create `web/src/data/types.ts`**

TypeScript types matching the JSON Schema at `schema/keyatlas.schema.json`:

```ts
export type KeyCombo = string[]

export type KeysField = KeyCombo | KeyCombo[]

export interface Entry {
  keys: KeysField
  win_keys?: KeysField
  alt_keys?: KeyCombo
  range?: KeyCombo
  action: string
}

export interface Section {
  name: string
  entries: Entry[]
}

export interface CheatsheetData {
  app: string
  subtitle?: string
  paper?: string
  columns?: number
  color?: string
  font_scale?: number
  orientation?: 'landscape' | 'portrait'
  sections: Section[]
}

export interface Cheatsheet extends CheatsheetData {
  slug: string
}

/** Type guard: is this a chord (array of arrays)? */
export function isChord(keys: KeysField): keys is KeyCombo[] {
  return Array.isArray(keys[0])
}
```

**Step 2: Create `web/src/data/cheatsheets.ts`**

Import all YAML files from `../../data/` (relative to `web/src/data/`) and export a typed array. The YAML plugin resolves imports relative to the source file:

```ts
import type { Cheatsheet, CheatsheetData } from './types'

import ghostty from '../../../data/ghostty.yaml'
import macosEssentials from '../../../data/macos-essentials.yaml'
import macosScreenshots from '../../../data/macos-screenshots.yaml'
import macosTextEditing from '../../../data/macos-text-editing.yaml'
import macosWindowManagement from '../../../data/macos-window-management.yaml'
import vscodeEditing from '../../../data/vscode-editing.yaml'
import vscodeGeneral from '../../../data/vscode-general.yaml'
import vscodeNavigation from '../../../data/vscode-navigation.yaml'

const raw: [string, CheatsheetData][] = [
  ['ghostty', ghostty as unknown as CheatsheetData],
  ['macos-essentials', macosEssentials as unknown as CheatsheetData],
  ['macos-screenshots', macosScreenshots as unknown as CheatsheetData],
  ['macos-text-editing', macosTextEditing as unknown as CheatsheetData],
  ['macos-window-management', macosWindowManagement as unknown as CheatsheetData],
  ['vscode-editing', vscodeEditing as unknown as CheatsheetData],
  ['vscode-general', vscodeGeneral as unknown as CheatsheetData],
  ['vscode-navigation', vscodeNavigation as unknown as CheatsheetData],
]

export const cheatsheets: Cheatsheet[] = raw.map(([slug, data]) => ({
  ...data,
  slug,
}))

export function getCheatsheet(slug: string): Cheatsheet | undefined {
  return cheatsheets.find((c) => c.slug === slug)
}
```

**Step 3: Verify imports compile**

```bash
cd web && pnpm dev
```

No errors in terminal. Open the browser console — no errors.

**Step 4: Commit**

```bash
git add web/src/data/ && git commit -m "feat(web): add data layer with YAML imports and TypeScript types"
```

---

## Task 3: Landing page — card grid at `/`

**Files:**
- Create: `web/src/components/AppCard.tsx`
- Create: `web/src/components/AppGrid.tsx`
- Modify: `web/src/routes/index.tsx`

**Step 1: Create `web/src/components/AppCard.tsx`**

A card component showing app name, subtitle, and accent color:

```tsx
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
```

**Step 2: Create `web/src/components/AppGrid.tsx`**

```tsx
import type { Cheatsheet } from '@/data/types'
import { AppCard } from './AppCard'

export function AppGrid({ cheatsheets }: { cheatsheets: Cheatsheet[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cheatsheets.map((cs) => (
        <AppCard key={cs.slug} cheatsheet={cs} />
      ))}
    </div>
  )
}
```

**Step 3: Update `web/src/routes/index.tsx`**

Replace the placeholder with the real landing page:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { cheatsheets } from '@/data/cheatsheets'
import { AppGrid } from '@/components/AppGrid'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">KeyAtlas</h1>
      <p className="mb-8 text-gray-500">Keyboard shortcut cheatsheets</p>
      <AppGrid cheatsheets={cheatsheets} />
    </div>
  )
}
```

**Step 4: Verify landing page renders**

```bash
cd web && pnpm dev
```

Open `http://localhost:3000/` — should see a card grid with all 8 cheatsheets, each showing app name, subtitle, section/shortcut counts, and accent color bar.

**Step 5: Commit**

```bash
git add web/src/components/AppCard.tsx web/src/components/AppGrid.tsx web/src/routes/index.tsx
git commit -m "feat(web): add landing page with cheatsheet card grid"
```

---

## Task 4: Cheatsheet detail page — sidebar + content

**Files:**
- Create: `web/src/routes/$appSlug.tsx`
- Create: `web/src/components/AppSidebar.tsx`
- Create: `web/src/components/CheatsheetView.tsx`
- Create: `web/src/components/KeyCombo.tsx`
- Create: `web/src/components/EntryRow.tsx`

**Step 1: Create `web/src/components/KeyCombo.tsx`**

Renders key combinations as styled `<kbd>` elements. Handles single combos, chords (sequences), and ranges:

```tsx
import { isChord, type KeysField, type KeyCombo as KeyComboType } from '@/data/types'

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-700 shadow-sm">
      {children}
    </kbd>
  )
}

function SingleCombo({ keys }: { keys: KeyComboType }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </span>
  )
}

export function KeyCombo({
  keys,
  range,
  altKeys,
}: {
  keys: KeysField
  range?: KeyComboType
  altKeys?: KeyComboType
}) {
  const main = isChord(keys) ? (
    <span className="inline-flex items-center gap-1">
      {keys.map((combo, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-gray-400">,</span>}
          <SingleCombo keys={combo} />
        </span>
      ))}
    </span>
  ) : (
    <SingleCombo keys={keys} />
  )

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {main}
      {range && (
        <span className="text-xs text-gray-400">
          –<Kbd>{range[0]}</Kbd>
        </span>
      )}
      {altKeys && (
        <>
          <span className="text-xs text-gray-400">/</span>
          <SingleCombo keys={altKeys} />
        </>
      )}
    </span>
  )
}
```

**Step 2: Create `web/src/components/EntryRow.tsx`**

A single keybinding row. The hide/show toggle will be added in Task 5:

```tsx
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
```

**Step 3: Create `web/src/components/CheatsheetView.tsx`**

Renders all sections and entries in a multi-column layout:

```tsx
import type { Cheatsheet } from '@/data/types'
import { EntryRow } from './EntryRow'

export function CheatsheetView({ cheatsheet }: { cheatsheet: Cheatsheet }) {
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
                <EntryRow key={ei} entry={entry} entryId={`${si}-${ei}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Create `web/src/components/AppSidebar.tsx`**

```tsx
import { Link, useParams } from '@tanstack/react-router'
import { cheatsheets } from '@/data/cheatsheets'

export function AppSidebar() {
  const { appSlug } = useParams({ strict: false })

  return (
    <nav className="sidebar w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="p-4">
        <Link to="/" className="text-lg font-bold text-gray-900 hover:underline">
          KeyAtlas
        </Link>
      </div>
      <ul className="space-y-0.5 px-2 pb-4">
        {cheatsheets.map((cs) => {
          const active = cs.slug === appSlug
          return (
            <li key={cs.slug}>
              <Link
                to="/$appSlug"
                params={{ appSlug: cs.slug }}
                className={`block rounded px-3 py-1.5 text-sm ${
                  active
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {cs.app}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

**Step 5: Create `web/src/routes/$appSlug.tsx`**

```tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getCheatsheet } from '@/data/cheatsheets'
import { AppSidebar } from '@/components/AppSidebar'
import { CheatsheetView } from '@/components/CheatsheetView'

export const Route = createFileRoute('/$appSlug')({
  component: CheatsheetPage,
  loader: ({ params }) => {
    const cheatsheet = getCheatsheet(params.appSlug)
    if (!cheatsheet) throw notFound()
    return { cheatsheet }
  },
})

function CheatsheetPage() {
  const { cheatsheet } = Route.useLoaderData()
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-8">
        <CheatsheetView cheatsheet={cheatsheet} />
      </main>
    </div>
  )
}
```

**Step 6: Verify detail page renders**

```bash
cd web && pnpm dev
```

Navigate to `http://localhost:3000/ghostty` — should show sidebar with all apps + multi-column cheatsheet with styled `<kbd>` keys. Click sidebar links to navigate between cheatsheets.

**Step 7: Commit**

```bash
git add web/src/components/KeyCombo.tsx web/src/components/EntryRow.tsx web/src/components/CheatsheetView.tsx web/src/components/AppSidebar.tsx web/src/routes/\$appSlug.tsx
git commit -m "feat(web): add cheatsheet detail page with sidebar and key rendering"
```

---

## Task 5: Hide/show feature — context + localStorage

**Files:**
- Create: `web/src/context/HiddenEntriesContext.tsx`
- Modify: `web/src/routes/__root.tsx` (wrap with provider)
- Modify: `web/src/components/EntryRow.tsx` (add toggle)
- Create: `web/src/components/Toolbar.tsx`
- Modify: `web/src/routes/$appSlug.tsx` (add toolbar + collapsed state)
- Modify: `web/src/components/CheatsheetView.tsx` (accept slug + collapsed props)

**Step 1: Create `web/src/context/HiddenEntriesContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'keyatlas:hidden'

type HiddenMap = Record<string, string[]>

function readStorage(): HiddenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStorage(data: HiddenMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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
    readStorage,
    () => ({}) as HiddenMap,
  )

  const isHidden = useCallback(
    (slug: string, entryId: string) => (data[slug] ?? []).includes(entryId),
    [data],
  )

  const toggle = useCallback((slug: string, entryId: string) => {
    const current = readStorage()
    const list = current[slug] ?? []
    if (list.includes(entryId)) {
      current[slug] = list.filter((id) => id !== entryId)
    } else {
      current[slug] = [...list, entryId]
    }
    writeStorage(current)
  }, [])

  const resetSlug = useCallback((slug: string) => {
    const current = readStorage()
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
```

**Step 2: Update `web/src/routes/__root.tsx`**

Add the `HiddenEntriesProvider` wrapping `{children}` in `RootDocument`:

```tsx
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { HiddenEntriesProvider } from '@/context/HiddenEntriesContext'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'KeyAtlas' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <HiddenEntriesProvider>
          {children}
        </HiddenEntriesProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

**Step 3: Update `web/src/components/EntryRow.tsx`**

Add eye toggle icon (using lucide-react, already installed) and hidden styling:

```tsx
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
```

**Step 4: Create `web/src/components/Toolbar.tsx`**

```tsx
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
```

**Step 5: Update `web/src/components/CheatsheetView.tsx`**

Accept `slug` and `collapsed` props, pass them through to each `EntryRow`:

```tsx
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
```

**Step 6: Update `web/src/routes/$appSlug.tsx`**

Add `Toolbar` and `collapsed` state:

```tsx
import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getCheatsheet } from '@/data/cheatsheets'
import { AppSidebar } from '@/components/AppSidebar'
import { CheatsheetView } from '@/components/CheatsheetView'
import { Toolbar } from '@/components/Toolbar'

export const Route = createFileRoute('/$appSlug')({
  component: CheatsheetPage,
  loader: ({ params }) => {
    const cheatsheet = getCheatsheet(params.appSlug)
    if (!cheatsheet) throw notFound()
    return { cheatsheet }
  },
})

function CheatsheetPage() {
  const { cheatsheet } = Route.useLoaderData()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-8">
        <Toolbar
          slug={cheatsheet.slug}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
        />
        <CheatsheetView
          cheatsheet={cheatsheet}
          slug={cheatsheet.slug}
          collapsed={collapsed}
        />
      </main>
    </div>
  )
}
```

**Step 7: Verify hide/show works**

```bash
cd web && pnpm dev
```

Navigate to a cheatsheet. Click eye icons — entries should toggle muted/strikethrough. Click "Collapse hidden" — hidden entries disappear. Refresh the page — hidden state should persist from localStorage.

**Step 8: Commit**

```bash
git add web/src/context/ web/src/components/ web/src/routes/
git commit -m "feat(web): add hide/show toggles with localStorage persistence"
```

---

## Task 6: Print styles — `@media print`

**Files:**
- Modify: `web/src/styles.css`

**Step 1: Add print styles to `web/src/styles.css`**

The file currently has `@import "tailwindcss"` and body styles. Append print rules:

```css
@import "tailwindcss";

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media print {
  body {
    background: white;
    font-size: 10pt;
  }

  @page {
    margin: 0.5in;
  }

  .sidebar,
  .toolbar,
  .toggle-btn {
    display: none !important;
  }

  main {
    padding: 0 !important;
  }

  .cheatsheet-columns {
    column-gap: 1.5rem;
  }

  .entry-row {
    padding-top: 0.15rem;
    padding-bottom: 0.15rem;
  }

  .break-inside-avoid {
    break-inside: avoid;
  }

  kbd {
    border: 1px solid #ccc;
    padding: 0 0.25em;
    font-size: 0.85em;
    box-shadow: none;
  }

  a {
    text-decoration: none !important;
    color: inherit !important;
  }
}
```

**Step 2: Verify print output**

```bash
cd web && pnpm dev
```

Navigate to a cheatsheet, hide a few entries and collapse them, then press `Cmd+P`. Print preview should show:
- No sidebar or toolbar
- No eye toggle icons
- Multi-column layout with accent-colored section headers
- Hidden/collapsed entries excluded
- Compact, clean layout

**Step 3: Commit**

```bash
git add web/src/styles.css
git commit -m "feat(web): add @media print styles for cheatsheet printing"
```

---

## Task 7: Static build + GitHub Pages deployment

**Files:**
- Modify: `web/vite.config.ts` (add static prerendering)
- Modify: `web/src/router.tsx` (add basepath for GitHub Pages)
- Create: `.github/workflows/pages.yml`

**Step 1: Configure static prerendering in `web/vite.config.ts`**

Add the Nitro `static` preset and prerender configuration. Update the existing `nitro()` plugin call:

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import yaml from '@modyfi/vite-plugin-yaml'

const config = defineConfig({
  plugins: [
    devtools(),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      preset: 'static',
      prerender: {
        routes: ['/'],
        crawlLinks: true,
      },
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    yaml(),
  ],
})

export default config
```

**Step 2: Add basepath to `web/src/router.tsx`**

Add `basepath: '/keyatlas'` for GitHub Pages subpath routing:

```ts
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    basepath: '/keyatlas',
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

**Step 3: Test static build locally**

```bash
cd web && pnpm build
ls .output/public/
```

Should produce HTML files for `/`, `/ghostty`, `/vscode-general`, etc. under `.output/public/`.

**Step 4: Create `.github/workflows/pages.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        working-directory: web

      - name: Build static site
        run: pnpm build
        working-directory: web

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: web/.output/public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 5: Commit**

```bash
git add web/vite.config.ts web/src/router.tsx .github/workflows/pages.yml
git commit -m "feat(web): add static prerendering and GitHub Pages deployment workflow"
```

---

## Summary

| Task | Description | Complexity |
|------|-------------|------------|
| 1 | Install YAML plugin + clean up demo content | Small |
| 2 | Data layer — YAML imports + types | Small |
| 3 | Landing page — card grid | Small |
| 4 | Cheatsheet detail page — sidebar + content | Medium |
| 5 | Hide/show — context + localStorage | Medium |
| 6 | Print styles — @media print | Small |
| 7 | Static build + GitHub Pages | Small |
