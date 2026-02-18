# KeyAtlas

Keyboard shortcut cheat sheets rendered as printable PDFs using [Typst](https://typst.app/).

## Prerequisites

- Python 3.13+
- [Typst CLI](https://github.com/typst/typst) — install via `brew install typst`, `cargo install typst-cli`, or your package manager
- [uv](https://docs.astral.sh/uv/) (recommended) for running the CLI

## Usage

Compile all cheat sheets in `data/` at once:

```sh
uv run keyatlas
```

Compile a single file:

```sh
uv run keyatlas data/ghostty.yaml
```

Compile specific files with shell globs:

```sh
uv run keyatlas data/vscode-*.yaml
```

Custom output path (single file only):

```sh
uv run keyatlas data/ghostty.yaml -o ~/Desktop/ghostty.pdf
```

Write all PDFs to a specific directory:

```sh
uv run keyatlas -d ~/Desktop/cheatsheets
```

## CLI flags

| Flag | Short | Description | Default |
|---|---|---|---|
| `--paper` | `-p` | Paper size (any Typst paper size string) | `us-letter` |
| `--color` | `-c` | Accent color as hex | `#4a90d9` |
| `--font-scale` | `-s` | Font size multiplier | `1.0` |
| `--orientation` | | Page orientation (`landscape` or `portrait`) | `landscape` |
| `--columns` | `-n` | Number of layout columns | `3` |
| `--output-dir` | `-d` | Output directory for PDFs | current directory |
| `--platform` | | Target platform: `mac`, `windows`, `both` | `mac` |
| `--output` | `-o` | Output path (single file only) | `{stem}.pdf` |

`--output` and `--output-dir` are mutually exclusive.

## Example commands

```sh
# Custom accent color
uv run keyatlas data/ghostty.yaml -c "#e63946" -o ~/Desktop/ghostty-red.pdf

# Smaller font for dense sheets
uv run keyatlas data/ghostty.yaml -s 0.85 -o ~/Desktop/ghostty-small.pdf

# Portrait A4 layout
uv run keyatlas data/ghostty.yaml --orientation portrait -p a4 -o ~/Desktop/ghostty-a4.pdf

# Two-column layout
uv run keyatlas data/ghostty.yaml -n 2 -o ~/Desktop/ghostty-2col.pdf

# Generate Windows key-label variants
uv run keyatlas --platform windows -d ~/Desktop/win

# Generate both Mac and Windows variants in one run
uv run keyatlas --platform both -d ~/Desktop/both
```

## Platform support

The `--platform` flag controls which key labels appear in the output:

| Value | Behaviour |
|---|---|
| `mac` (default) | Uses the key symbols as written in the YAML file. |
| `windows` | Applies automatic Mac→Windows key mapping (e.g. `⌘` → `Ctrl`, `⌥` → `Alt`). If a `win_keys` field is present on an entry it is used as-is, bypassing the auto-mapping. |
| `both` | Produces two PDFs per input file — one for each platform — named `{stem}-mac.pdf` and `{stem}-windows.pdf`. |

### Mac-to-Windows automatic mapping

| Mac symbol | Windows label |
|---|---|
| `⌘` Command | `Ctrl` |
| `⌥` Option | `Alt` |
| `⇧` Shift | `Shift` |
| `⌃` Control | `Ctrl` |
| `↵` Return | `Enter` |
| `⌫` Delete | `Backspace` |
| `⎋` Escape | `Esc` |

## YAML format

Each file in `data/` defines one cheat sheet. All fields except `app` and `sections` are optional and can be overridden at compile time with CLI flags.

### Top-level fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `app` | string | yes | — | Application name shown in the title |
| `subtitle` | string | no | — | Subtitle below the title |
| `paper` | string | no | `us-letter` | Paper size (any Typst paper size string) |
| `columns` | integer (1–6) | no | `3` | Number of layout columns |
| `color` | string | no | `#4a90d9` | Accent color as a `#rrggbb` hex string |
| `font_scale` | number (0.5–2.0) | no | `1.0` | Font size multiplier |
| `orientation` | `landscape` or `portrait` | no | `landscape` | Page orientation |
| `sections` | list | yes | — | List of sections (see below) |

### Section fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Section heading |
| `entries` | list | yes | List of keybinding entries |

### Entry fields

| Field | Type | Required | Description |
|---|---|---|---|
| `keys` | list of strings or list of lists | yes | Primary key combination (Mac). See below for chord syntax. |
| `win_keys` | list of strings or list of lists | no | Windows-specific override for `keys`. Bypasses auto-mapping. |
| `alt_keys` | list of strings | no | Alternate key combination shown alongside `keys` |
| `range` | list of strings | no | End of a numeric range (e.g. `["8"]` renders `1–8`) |
| `action` | string | yes | Human-readable action description |

### Key syntax

A simple combination is a flat array of strings:

```yaml
keys: ["⌘", "N"]
```

A chord (two key combinations pressed in sequence) uses an array of arrays:

```yaml
keys: [["⌘", "K"], ["⌘", "S"]]
```

### Full example

```yaml
app: My App
subtitle: macOS shortcuts
columns: 2
color: "#e63946"
font_scale: 0.9
orientation: portrait
sections:
  - name: General
    entries:
      - keys: ["⌘", "N"]
        action: New file
      - keys: ["⌘", "⌥", "N"]
        win_keys: ["Ctrl", "Alt", "N"]
        action: New window
      - keys: [["⌘", "K"], ["⌘", "S"]]
        action: Open Keyboard Shortcuts
      - keys: ["⌘", "1"]
        action: "Go to tab 1–8"
        range: ["8"]
      - keys: ["⌘", "↵"]
        alt_keys: ["⌃", "F"]
        action: Toggle fullscreen
```

## JSON Schema / IDE validation

A [JSON Schema](https://json-schema.org/) file is provided at `schema/keyatlas.schema.json` (draft 2020-12). It describes all valid fields, types, and constraints for the YAML data files.

If your editor supports the [yaml-language-server](https://github.com/redhat-developer/yaml-language-server) (e.g. VS Code with the YAML extension), the bundled data files already include the schema association comment and will validate automatically:

```yaml
# yaml-language-server: $schema=../schema/keyatlas.schema.json
app: My App
...
```

Add the same comment to any new files you create in `data/` to get inline validation and autocompletion.

## Adding a new app

1. Create `data/<app>.yaml` with the schema comment and keybinding data.
2. Run `uv run keyatlas data/<app>.yaml` to generate the PDF.

## Project structure

```
keyatlas/
├── data/                # Keybinding data (YAML, one file per app)
│   ├── ghostty.yaml
│   ├── vscode-general.yaml
│   ├── vscode-editing.yaml
│   └── vscode-navigation.yaml
├── schema/
│   └── keyatlas.schema.json  # JSON Schema for YAML data files
├── src/keyatlas/        # Python CLI package
│   ├── __init__.py
│   └── cli.py           # Entry point: compiles YAML → PDF via Typst
├── template/
│   └── cheatsheet.typ   # Reusable Typst template
└── pyproject.toml
```
