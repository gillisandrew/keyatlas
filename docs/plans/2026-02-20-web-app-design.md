# KeyAtlas Web App Design

A statically generated React app for browsing keybinding cheatsheets on the web, with support for hiding entries and printing.

## Architecture

The web app lives at `web/` in the existing monorepo alongside the Python CLI. It is a TanStack Start project using Vite. At build time, YAML files from `../data/*.yaml` are imported via a Vite YAML plugin, compiled to typed JSON and bundled into the app. TanStack Start's static prerendering generates a fully static site suitable for GitHub Pages.

### Routes

- `/` — landing page with a card grid of all available cheatsheets (app name, subtitle, accent color)
- `/$appSlug` — cheatsheet detail view with a persistent sidebar and main content area

The slug is derived from the YAML filename (strip `.yaml`).

### Key Dependencies

- `@tanstack/react-start`
- `@tanstack/react-router`
- `vite` with YAML plugin
- Tailwind CSS

## Data Flow & Components

### Data Layer

A single `data.ts` module imports all YAML files and exports a typed array of cheatsheet objects. Each object contains the app name, subtitle, color, sections, and a `slug` derived from the filename. This is the single source of truth for both the landing grid and detail views.

### Components

- **`AppGrid`** — landing page card grid. Each card shows app name, subtitle, and uses the YAML `color` as an accent. Cards link to `/$appSlug`.
- **`CheatsheetLayout`** — detail page layout with `AppSidebar` and main content area.
- **`AppSidebar`** — vertical list of all apps, highlights the active one.
- **`CheatsheetView`** — renders sections and entries in a multi-column layout.
- **`KeyCombo`** — renders key combinations as styled `<kbd>` elements. Handles chords and ranges.
- **`EntryRow`** — single keybinding row with a visibility toggle icon.

## Hide/Show Behavior

Each `EntryRow` has an eye icon on the far right. Clicking toggles that entry's visibility. Hidden entries get a muted/strikethrough treatment. A toolbar toggle collapses hidden entries out of view entirely. A "Reset" button clears all hidden entries for the current cheatsheet.

### State Persistence

- React context (`HiddenEntriesContext`) provides read/write access
- Entry IDs are `sectionIndex-entryIndex` (deterministic, data is static)
- localStorage key: `keyatlas:hidden`
- Value: `{ "ghostty": ["0-2", "1-5"], "vscode-general": ["2-0"] }`

## Print (`@media print`)

- Hidden/collapsed entries excluded via `display: none`
- Sidebar, toolbar, and toggle icons hidden
- Multi-column CSS layout matching the YAML `columns` field
- Accent color applied to section headers from YAML `color`
- Compact spacing and smaller fonts for density
- `@page` rule for margins and orientation
- `break-inside: avoid` on sections
- "Print" button in toolbar triggers `window.print()`

Goal: `Cmd+P` from a detail page produces output resembling the Typst-generated PDFs.

## GitHub Pages Deployment

### Build

TanStack Start static prerendering generates `web/dist/` with pre-rendered HTML for every route plus JS/CSS assets.

### GitHub Actions

A `pages.yml` workflow on pushes to `main`:

1. Checkout repo
2. Install Node dependencies in `web/`
3. Run `npm run build`
4. Deploy `web/dist/` via `actions/deploy-pages`

The existing `release.yml` for PDFs remains separate (triggers on version tags).

### Configuration

- Vite `base` set to `/keyatlas/` for GitHub Pages subpath
- TanStack Router `basepath` set to match
- Every route has its own `index.html` — no SPA fallback hack needed
