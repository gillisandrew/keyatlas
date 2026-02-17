# KeyAtlas Feature Batch Design

Date: 2026-02-17

## Overview

Six features that collectively upgrade KeyAtlas from a minimal macOS-only cheat sheet generator into a configurable, cross-platform tool with a refined visual identity. The features are ordered by implementation dependency.

---

## 1. CLI Overrides & YAML Configuration

New CLI flags, all optional, with YAML equivalents:

| Flag | Short | Type | Default | YAML field |
|---|---|---|---|---|
| `--paper` | `-p` | string | `us-letter` | `paper` |
| `--color` | `-c` | hex string | `#4a90d9` | `color` |
| `--font-scale` | `-s` | float | `1.0` | `font_scale` |
| `--orientation` | | `landscape`/`portrait` | `landscape` | `orientation` |
| `--columns` | `-n` | int | `3` | `columns` |
| `--output-dir` | `-d` | path | cwd | n/a |
| `--platform` | | `mac`/`windows`/`both` | `mac` | n/a |

**Precedence:** CLI flag > YAML value > built-in default.

The CLI merges flags and YAML values into a config dict before generating the Typst entrypoint. The generated `.typ` file passes all values as parameters to the template functions. The Typst template gains matching parameters with identical defaults.

**Mutual exclusion:** `-o` and `-d` cannot be used together (argparse `mutually_exclusive_group`). `-o` requires exactly one input file.

---

## 2. Output Directory Support

When `--output-dir` / `-d` is given, all generated PDFs go to that directory using the YAML file's stem as the filename (`ghostty.yaml` -> `output_dir/ghostty.pdf`).

- Directory is created if it doesn't exist.
- When neither `-o` nor `-d` is given, PDFs go to cwd (current behavior preserved).
- Default zero-arg behavior unchanged: `uv run keyatlas` compiles all `data/*.yaml` to cwd.

---

## 3. Windows Keymaps & Platform Support

### YAML format extension

```yaml
entries:
  - keys: ["⌘", "N"]
    win_keys: ["Ctrl", "N"]    # optional
    action: New window
```

### Auto-mapping fallback

When `win_keys` is absent and `--platform windows` is used, apply this mapping:

| macOS | Windows |
|---|---|
| `⌘` | `Ctrl` |
| `⌥` | `Alt` |
| `⇧` | `Shift` |
| `⌃` | `Ctrl` |
| `↵` | `Enter` |
| `⌫` | `Backspace` |
| `⎋` | `Esc` |

Other keys (letters, numbers, arrows, Fn, Tab, Space) pass through unchanged.

### --platform flag behavior

- `mac` (default): render `keys`, ignore `win_keys`.
- `windows`: render `win_keys` if present, else auto-map from `keys`.
- `both`: generate two PDFs per input — `{stem}-mac.pdf` and `{stem}-win.pdf`.

The mapping lives in `cli.py` as a dict. Applied at the Python level before Typst generation — the template always receives resolved key lists.

---

## 4. Chord Shortcuts

### YAML format — nested lists

```yaml
# Simple shortcut (unchanged)
- keys: ["⌘", "S"]
  action: Save

# Chord shortcut (list of lists)
- keys: [["⌘", "K"], ["⌘", "S"]]
  action: Open Keyboard Shortcuts
```

### Detection

`render-keys` checks if the first element of `keys` is an array. If yes, treat as chord (render steps joined by comma separator). If no, treat as simple shortcut (render joined by `+`).

### Rendering

`⌘+K , ⌘+S` — each step gets keycap styling. Steps separated by a styled comma in lighter color with spacing to distinguish "then" from "together."

### win_keys for chords

Same nested structure. Auto-mapping walks the structure recursively.

### Migration

Existing data files with flat chord encoding (`["⌘K", "⌘S"]`) will be migrated to nested format.

---

## 5. JSON Schema

File: `schema/keyatlas.schema.json`

### Top-level properties

- `app` — string, required
- `subtitle` — string, optional
- `paper` — string, optional, default `"us-letter"`
- `columns` — integer, optional, min 1, max 6, default 3
- `color` — string, optional, pattern `^#[0-9a-fA-F]{6}$`
- `font_scale` — number, optional, min 0.5, max 2.0, default 1.0
- `orientation` — enum `"landscape"` | `"portrait"`, optional, default `"landscape"`
- `sections` — array of section objects, required, min 1

### Section object

- `name` — string, required
- `entries` — array of entry objects, required, min 1

### Entry object

- `keys` — `oneOf`: array of strings (simple) or array of arrays of strings (chord). Required.
- `win_keys` — same structure as `keys`, optional
- `alt_keys` — array of strings, optional
- `range` — array of strings, optional
- `action` — string, required

The schema enables IDE autocompletion and validation. Referenced in README. Not enforced at runtime.

---

## 6. Design Refresh (Swiss/International Style)

Complete visual overhaul of `template/cheatsheet.typ`. The new design replaces the current template entirely.

### Typography

- Large, bold title text (40-50pt) rendered semi-transparent behind the first column, creating an overlapping branded element.
- Section headers use uppercase with letter-spacing (tracking) in the accent color.
- Helvetica Neue retained. Generous whitespace throughout.

### Color & Depth

- Accent color at 10-15% opacity for large background shapes and section fills.
- Key caps: lighter, flatter style with subtle border instead of heavy shadow.
- Alternating row backgrounds use accent color tints (`accent.lighten(95%)`) instead of neutral gray.
- Section headers: thin left border accent stripe instead of full background fill.

### Layout

- `font_scale` multiplier applied to base size (8.5pt x scale). All other sizes scale proportionally.
- `orientation` controls the `flipped` page parameter.
- Thin hairline column rules between columns.
- Airy spacing between sections.

### Metadata Footer

- Small text at bottom-right: `keyatlas v{version}`.
- Version read from `importlib.metadata.version("keyatlas")` at runtime, passed to template as parameter.

### Template Parameter Changes

`cheatsheet` gains: `font-scale`, `orientation`, `version`.
`render-keys` gains: chord detection and comma-separator logic.
`render-entry`: updated visual style.
`keybinding-section`: stripe header + uppercase treatment.
New: decorative title overlay element.

---

## Implementation Order

1. **CLI overrides & YAML config** — foundational plumbing everything else uses
2. **Output directory** — small, isolated, unblocks batch workflows
3. **Chord shortcuts** — YAML format change + template update + data migration
4. **Windows keymaps** — YAML format extension + mapping logic + --platform flag
5. **JSON Schema** — documents the now-stable YAML format
6. **Design refresh** — visual overhaul using all new template parameters
