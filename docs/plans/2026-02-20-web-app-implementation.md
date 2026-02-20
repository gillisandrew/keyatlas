# KeyAtlas Web App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a statically generated React web app for browsing keyboard shortcut cheatsheets, with hide/show toggles and print support, deployed to GitHub Pages.

**Architecture:** TanStack Start app in `web/` using Vite with a YAML plugin to import `../data/*.yaml` at build time. Static prerendering produces HTML for each route. Sidebar navigation on detail pages, card grid on landing page.

**Tech Stack:** TanStack Start, TanStack Router, React, Vite, `@modyfi/vite-plugin-yaml`, Tailwind CSS v4, TypeScript

**Working directory:** `.worktrees/feature-web-app/web/`

**Design doc:** `docs/plans/2026-02-20-web-app-design.md`

---

## Task 1: Scaffold TanStack Start project

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/app.config.ts`
- Create: `web/app/router.tsx`
- Create: `web/app/client.tsx`
- Create: `web/app/ssr.tsx`
- Create: `web/app/routeTree.gen.ts` (generated)
- Create: `web/app/routes/__root.tsx`

**Step 1: Initialize the project**

```bash
cd .worktrees/feature-web-app
mkdir -p web
cd web
npm init -y
npm install @tanstack/react-start @tanstack/react-router react react-dom vinxi
npm install -D typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite @modyfi/vite-plugin-yaml
```

**Step 2: Create `web/app.config.ts`**

TanStack Start app configuration with Vite plugins for Tailwind and YAML:

```ts
import { defineConfig } from "@tanstack/react-start/config";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
```

**Step 3: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "es2022",
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "~/*": ["./app/*"]
    }
  },
  "include": ["app/**/*.ts", "app/**/*.tsx"]
}
```

**Step 4: Create `web/app/router.tsx`**

```tsx
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  return createTanStackRouter({ routeTree, basepath: "/keyatlas" });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
```

**Step 5: Create `web/app/client.tsx`**

```tsx
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { createRouter } from "./router";

const router = createRouter();
hydrateRoot(document, <StartClient router={router} />);
```

**Step 6: Create `web/app/ssr.tsx`**

```tsx
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createRouter } from "./router";

export default createStartHandler({ createRouter })(defaultStreamHandler);
```

**Step 7: Create `web/app/routes/__root.tsx`**

Minimal root layout with Tailwind CSS import:

```tsx
import { createRootRoute, Outlet, ScrollRestoration } from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/react-start";

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KeyAtlas" },
    ],
    links: [
      { rel: "stylesheet", href: "/app/styles/app.css" },
    ],
  }),
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

**Step 8: Create `web/app/styles/app.css`**

```css
@import "tailwindcss";
```

**Step 9: Verify it runs**

```bash
cd web
npx vinxi dev
```

Open `http://localhost:3000/keyatlas/` — should see a blank page with no errors.

**Step 10: Commit**

```bash
git add web/
git commit -m "feat(web): scaffold TanStack Start project with Tailwind and YAML plugin"
```

---

## Task 2: Data layer — YAML imports and TypeScript types

**Files:**
- Create: `web/app/data/cheatsheets.ts`
- Create: `web/app/data/types.ts`
- Create: `web/yaml.d.ts`

**Step 1: Create YAML type declaration `web/yaml.d.ts`**

```ts
declare module "*.yaml" {
  const data: Record<string, unknown>;
  export default data;
}
```

**Step 2: Create `web/app/data/types.ts`**

TypeScript types matching the JSON Schema at `schema/keyatlas.schema.json`:

```ts
export type KeyCombo = string[];

export type KeysField = KeyCombo | KeyCombo[];

export interface Entry {
  keys: KeysField;
  win_keys?: KeysField;
  alt_keys?: KeyCombo;
  range?: KeyCombo;
  action: string;
}

export interface Section {
  name: string;
  entries: Entry[];
}

export interface CheatsheetData {
  app: string;
  subtitle?: string;
  paper?: string;
  columns?: number;
  color?: string;
  font_scale?: number;
  orientation?: "landscape" | "portrait";
  sections: Section[];
}

export interface Cheatsheet extends CheatsheetData {
  slug: string;
}

/** Type guard: is this a chord (array of arrays)? */
export function isChord(keys: KeysField): keys is KeyCombo[] {
  return Array.isArray(keys[0]);
}
```

**Step 3: Create `web/app/data/cheatsheets.ts`**

Import all YAML files and export typed cheatsheet array:

```ts
import type { Cheatsheet, CheatsheetData } from "./types";

import ghostty from "../../../data/ghostty.yaml";
import macosEssentials from "../../../data/macos-essentials.yaml";
import macosScreenshots from "../../../data/macos-screenshots.yaml";
import macosTextEditing from "../../../data/macos-text-editing.yaml";
import macosWindowManagement from "../../../data/macos-window-management.yaml";
import vscodeEditing from "../../../data/vscode-editing.yaml";
import vscodeGeneral from "../../../data/vscode-general.yaml";
import vscodeNavigation from "../../../data/vscode-navigation.yaml";

const raw: [string, CheatsheetData][] = [
  ["ghostty", ghostty as unknown as CheatsheetData],
  ["macos-essentials", macosEssentials as unknown as CheatsheetData],
  ["macos-screenshots", macosScreenshots as unknown as CheatsheetData],
  ["macos-text-editing", macosTextEditing as unknown as CheatsheetData],
  ["macos-window-management", macosWindowManagement as unknown as CheatsheetData],
  ["vscode-editing", vscodeEditing as unknown as CheatsheetData],
  ["vscode-general", vscodeGeneral as unknown as CheatsheetData],
  ["vscode-navigation", vscodeNavigation as unknown as CheatsheetData],
];

export const cheatsheets: Cheatsheet[] = raw.map(([slug, data]) => ({
  ...data,
  slug,
}));

export function getCheatsheet(slug: string): Cheatsheet | undefined {
  return cheatsheets.find((c) => c.slug === slug);
}
```

**Step 4: Verify imports compile**

```bash
cd web && npx vinxi dev
```

No errors in terminal. The YAML plugin should resolve `../../../data/*.yaml` relative to the source file.

**Step 5: Commit**

```bash
git add web/app/data/ web/yaml.d.ts
git commit -m "feat(web): add data layer with YAML imports and TypeScript types"
```

---

## Task 3: Landing page — card grid at `/`

**Files:**
- Create: `web/app/routes/index.tsx`
- Create: `web/app/components/AppGrid.tsx`
- Create: `web/app/components/AppCard.tsx`

**Step 1: Create `web/app/components/AppCard.tsx`**

A card component showing app name, subtitle, and accent color:

```tsx
import { Link } from "@tanstack/react-router";
import type { Cheatsheet } from "~/data/types";

export function AppCard({ cheatsheet }: { cheatsheet: Cheatsheet }) {
  const color = cheatsheet.color ?? "#4a90d9";
  const entryCount = cheatsheet.sections.reduce((n, s) => n + s.entries.length, 0);

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
  );
}
```

**Step 2: Create `web/app/components/AppGrid.tsx`**

```tsx
import type { Cheatsheet } from "~/data/types";
import { AppCard } from "./AppCard";

export function AppGrid({ cheatsheets }: { cheatsheets: Cheatsheet[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cheatsheets.map((cs) => (
        <AppCard key={cs.slug} cheatsheet={cs} />
      ))}
    </div>
  );
}
```

**Step 3: Create `web/app/routes/index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { cheatsheets } from "~/data/cheatsheets";
import { AppGrid } from "~/components/AppGrid";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">KeyAtlas</h1>
      <p className="mb-8 text-gray-500">Keyboard shortcut cheatsheets</p>
      <AppGrid cheatsheets={cheatsheets} />
    </div>
  );
}
```

**Step 4: Verify landing page renders**

```bash
cd web && npx vinxi dev
```

Open `http://localhost:3000/keyatlas/` — should see card grid with all 8 cheatsheets.

**Step 5: Commit**

```bash
git add web/app/components/AppCard.tsx web/app/components/AppGrid.tsx web/app/routes/index.tsx
git commit -m "feat(web): add landing page with cheatsheet card grid"
```

---

## Task 4: Cheatsheet detail page — sidebar + content

**Files:**
- Create: `web/app/routes/$appSlug.tsx`
- Create: `web/app/components/AppSidebar.tsx`
- Create: `web/app/components/CheatsheetView.tsx`
- Create: `web/app/components/KeyCombo.tsx`
- Create: `web/app/components/EntryRow.tsx`

**Step 1: Create `web/app/components/KeyCombo.tsx`**

Renders key combinations as styled `<kbd>` elements. Handles single combos, chords, and ranges:

```tsx
import { isChord, type KeysField, type KeyCombo as KeyComboType } from "~/data/types";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-700 shadow-sm">
      {children}
    </kbd>
  );
}

function SingleCombo({ keys }: { keys: KeyComboType }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </span>
  );
}

export function KeyCombo({
  keys,
  range,
  altKeys,
}: {
  keys: KeysField;
  range?: KeyComboType;
  altKeys?: KeyComboType;
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
  );

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
  );
}
```

**Step 2: Create `web/app/components/EntryRow.tsx`**

A single keybinding row (hide/show toggle added in Task 5):

```tsx
import type { Entry } from "~/data/types";
import { KeyCombo } from "./KeyCombo";

export function EntryRow({
  entry,
  entryId,
}: {
  entry: Entry;
  entryId: string;
}) {
  return (
    <div className="entry-row flex items-center justify-between gap-4 py-1.5">
      <span className="shrink-0">
        <KeyCombo keys={entry.keys} range={entry.range} altKeys={entry.alt_keys} />
      </span>
      <span className="text-sm text-gray-600">{entry.action}</span>
    </div>
  );
}
```

**Step 3: Create `web/app/components/CheatsheetView.tsx`**

Renders all sections and entries in a multi-column layout:

```tsx
import type { Cheatsheet } from "~/data/types";
import { EntryRow } from "./EntryRow";

export function CheatsheetView({ cheatsheet }: { cheatsheet: Cheatsheet }) {
  const color = cheatsheet.color ?? "#4a90d9";
  const columns = cheatsheet.columns ?? 3;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{cheatsheet.app}</h1>
        {cheatsheet.subtitle && (
          <p className="mt-1 text-sm text-gray-500">{cheatsheet.subtitle}</p>
        )}
      </div>
      <div
        className="cheatsheet-columns gap-6"
        style={{ columnCount: columns }}
      >
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
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Create `web/app/components/AppSidebar.tsx`**

```tsx
import { Link, useParams } from "@tanstack/react-router";
import { cheatsheets } from "~/data/cheatsheets";

export function AppSidebar() {
  const { appSlug } = useParams({ strict: false });

  return (
    <nav className="sidebar w-56 shrink-0 border-r border-gray-200 bg-white print:hidden">
      <div className="p-4">
        <Link to="/" className="text-lg font-bold text-gray-900 hover:underline">
          KeyAtlas
        </Link>
      </div>
      <ul className="space-y-0.5 px-2 pb-4">
        {cheatsheets.map((cs) => {
          const active = cs.slug === appSlug;
          return (
            <li key={cs.slug}>
              <Link
                to="/$appSlug"
                params={{ appSlug: cs.slug }}
                className={`block rounded px-3 py-1.5 text-sm ${
                  active
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {cs.app}
                {cs.subtitle && (
                  <span className="ml-1 text-xs text-gray-400">
                    — {cs.subtitle}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

**Step 5: Create `web/app/routes/$appSlug.tsx`**

```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getCheatsheet } from "~/data/cheatsheets";
import { AppSidebar } from "~/components/AppSidebar";
import { CheatsheetView } from "~/components/CheatsheetView";

export const Route = createFileRoute("/$appSlug")({
  component: CheatsheetPage,
  loader: ({ params }) => {
    const cheatsheet = getCheatsheet(params.appSlug);
    if (!cheatsheet) throw notFound();
    return { cheatsheet };
  },
});

function CheatsheetPage() {
  const { cheatsheet } = Route.useLoaderData();
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-8">
        <CheatsheetView cheatsheet={cheatsheet} />
      </main>
    </div>
  );
}
```

**Step 6: Verify detail page renders**

```bash
cd web && npx vinxi dev
```

Navigate to `http://localhost:3000/keyatlas/ghostty` — should show sidebar + multi-column cheatsheet with styled `<kbd>` keys.

**Step 7: Commit**

```bash
git add web/app/components/ web/app/routes/\$appSlug.tsx
git commit -m "feat(web): add cheatsheet detail page with sidebar and key rendering"
```

---

## Task 5: Hide/show feature — context + localStorage

**Files:**
- Create: `web/app/context/HiddenEntriesContext.tsx`
- Modify: `web/app/components/EntryRow.tsx` (add toggle)
- Create: `web/app/components/Toolbar.tsx`
- Modify: `web/app/routes/$appSlug.tsx` (add toolbar)

**Step 1: Create `web/app/context/HiddenEntriesContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "keyatlas:hidden";

type HiddenMap = Record<string, string[]>;

function readStorage(): HiddenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(data: HiddenMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("keyatlas-hidden-change"));
}

interface HiddenEntriesContextValue {
  isHidden: (slug: string, entryId: string) => boolean;
  toggle: (slug: string, entryId: string) => void;
  resetSlug: (slug: string) => void;
  hiddenCount: (slug: string) => number;
}

const HiddenEntriesContext = createContext<HiddenEntriesContextValue | null>(null);

export function HiddenEntriesProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(
    (cb) => {
      window.addEventListener("keyatlas-hidden-change", cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener("keyatlas-hidden-change", cb);
        window.removeEventListener("storage", cb);
      };
    },
    readStorage,
    () => ({} as HiddenMap),
  );

  const isHidden = useCallback(
    (slug: string, entryId: string) => (data[slug] ?? []).includes(entryId),
    [data],
  );

  const toggle = useCallback((slug: string, entryId: string) => {
    const current = readStorage();
    const list = current[slug] ?? [];
    if (list.includes(entryId)) {
      current[slug] = list.filter((id) => id !== entryId);
    } else {
      current[slug] = [...list, entryId];
    }
    writeStorage(current);
  }, []);

  const resetSlug = useCallback((slug: string) => {
    const current = readStorage();
    delete current[slug];
    writeStorage(current);
  }, []);

  const hiddenCount = useCallback(
    (slug: string) => (data[slug] ?? []).length,
    [data],
  );

  const value = useMemo(
    () => ({ isHidden, toggle, resetSlug, hiddenCount }),
    [isHidden, toggle, resetSlug, hiddenCount],
  );

  return (
    <HiddenEntriesContext.Provider value={value}>
      {children}
    </HiddenEntriesContext.Provider>
  );
}

export function useHiddenEntries() {
  const ctx = useContext(HiddenEntriesContext);
  if (!ctx) throw new Error("useHiddenEntries must be used within HiddenEntriesProvider");
  return ctx;
}
```

**Step 2: Update `web/app/routes/__root.tsx`**

Wrap `<Outlet />` with the `HiddenEntriesProvider`.

**Step 3: Update `web/app/components/EntryRow.tsx`**

Add eye toggle icon and hidden styling:

```tsx
import type { Entry } from "~/data/types";
import { KeyCombo } from "./KeyCombo";
import { useHiddenEntries } from "~/context/HiddenEntriesContext";

export function EntryRow({
  entry,
  entryId,
  slug,
  collapsed,
}: {
  entry: Entry;
  entryId: string;
  slug: string;
  collapsed: boolean;
}) {
  const { isHidden, toggle } = useHiddenEntries();
  const hidden = isHidden(slug, entryId);

  if (hidden && collapsed) return null;

  return (
    <div
      className={`entry-row flex items-center justify-between gap-4 py-1.5 ${
        hidden ? "opacity-40 line-through" : ""
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
          title={hidden ? "Show" : "Hide"}
        >
          {hidden ? "○" : "●"}
        </button>
      </span>
    </div>
  );
}
```

**Step 4: Create `web/app/components/Toolbar.tsx`**

```tsx
import { useHiddenEntries } from "~/context/HiddenEntriesContext";

export function Toolbar({
  slug,
  collapsed,
  onToggleCollapsed,
}: {
  slug: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { resetSlug, hiddenCount } = useHiddenEntries();
  const count = hiddenCount(slug);

  return (
    <div className="toolbar mb-4 flex items-center gap-3 print:hidden">
      {count > 0 && (
        <>
          <button
            onClick={onToggleCollapsed}
            className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            {collapsed ? `Show ${count} hidden` : "Collapse hidden"}
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
        Print
      </button>
    </div>
  );
}
```

**Step 5: Update `web/app/routes/$appSlug.tsx`**

Add `Toolbar` and pass `slug` + `collapsed` state down through `CheatsheetView` to `EntryRow`.

**Step 6: Update `web/app/components/CheatsheetView.tsx`**

Accept `slug` and `collapsed` props and pass them to each `EntryRow`.

**Step 7: Verify hide/show works**

```bash
cd web && npx vinxi dev
```

Click eye icons, verify entries toggle muted/strikethrough. Click "Collapse hidden" to hide them. Refresh — state should persist.

**Step 8: Commit**

```bash
git add web/app/context/ web/app/components/ web/app/routes/
git commit -m "feat(web): add hide/show toggles with localStorage persistence"
```

---

## Task 6: Print styles — `@media print`

**Files:**
- Modify: `web/app/styles/app.css`

**Step 1: Add print styles to `web/app/styles/app.css`**

```css
@import "tailwindcss";

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
cd web && npx vinxi dev
```

Navigate to a cheatsheet, hide a few entries, collapse them, then press `Cmd+P`. Print preview should show:
- No sidebar or toolbar
- Multi-column layout
- Hidden entries excluded
- Compact, clean layout with accent-colored headers

**Step 3: Commit**

```bash
git add web/app/styles/app.css
git commit -m "feat(web): add @media print styles for cheatsheet printing"
```

---

## Task 7: Static build + GitHub Pages deployment

**Files:**
- Modify: `web/app.config.ts` (add static prerendering)
- Create: `.github/workflows/pages.yml`

**Step 1: Configure static prerendering in `web/app.config.ts`**

Add the `server.preset` and `server.prerender` config to produce static HTML for all routes:

```ts
import { defineConfig } from "@tanstack/react-start/config";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
  server: {
    preset: "static",
    prerender: {
      routes: ["/"],
      crawlLinks: true,
    },
  },
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
```

**Step 2: Add build script to `web/package.json`**

Ensure `scripts` has:

```json
{
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start"
  }
}
```

**Step 3: Test static build locally**

```bash
cd web && npm run build
ls .output/public/
```

Should produce HTML files for `/`, `/ghostty`, `/vscode-general`, etc.

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

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm install
        working-directory: web

      - name: Build static site
        run: npm run build
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
git add web/app.config.ts web/package.json .github/workflows/pages.yml
git commit -m "feat(web): add static prerendering and GitHub Pages deployment workflow"
```

---

## Summary

| Task | Description | Estimated complexity |
|------|-------------|---------------------|
| 1 | Scaffold TanStack Start project | Medium — several config files |
| 2 | Data layer — YAML imports + types | Small |
| 3 | Landing page — card grid | Small |
| 4 | Cheatsheet detail page — sidebar + content | Medium — several components |
| 5 | Hide/show — context + localStorage | Medium — state management |
| 6 | Print styles — @media print | Small |
| 7 | Static build + GitHub Pages | Small — config + workflow |
