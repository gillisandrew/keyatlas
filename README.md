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

## Adding a new app

Create `data/<app>.yaml` with keybinding data:

```yaml
app: App Name
subtitle: Description
sections:
  - name: Section Name
    entries:
      - keys: ["⌘", "N"]
        action: Do something
```

Then run `uv run keyatlas data/<app>.yaml` to generate the PDF.

### YAML schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app` | string | yes | Application name (shown in title) |
| `subtitle` | string | no | Subtitle below the title |
| `paper` | string | no | Paper size (default: `us-letter`) |
| `columns` | int | no | Number of columns (default: `3`) |
| `sections` | list | yes | List of sections |
| `sections[].name` | string | yes | Section heading |
| `sections[].entries` | list | yes | List of keybinding entries |
| `entries[].keys` | list[string] | yes | Key sequence, e.g. `["⌘", "N"]` |
| `entries[].alt_keys` | list[string] | no | Alternate key sequence |
| `entries[].action` | string | yes | Action description |
| `entries[].range` | list[string] | no | End of a numeric range, e.g. `["8"]` |

Chord shortcuts (like `Cmd+K Cmd+S`) are written as combined strings: `["⌘K", "⌘S"]`.

## Project structure

```
keyatlas/
├── data/                # Keybinding data (YAML, one file per app)
│   ├── ghostty.yaml
│   ├── vscode-general.yaml
│   ├── vscode-editing.yaml
│   └── vscode-navigation.yaml
├── src/keyatlas/        # Python CLI package
│   ├── __init__.py
│   └── cli.py           # Entry point: compiles YAML → PDF via Typst
├── template/
│   └── cheatsheet.typ   # Reusable Typst template
└── pyproject.toml
```
