# KeyAtlas

Keyboard shortcut cheat sheets rendered as printable PDFs using [Typst](https://typst.app/).

## Prerequisites

- [Typst CLI](https://github.com/typst/typst) — install via `brew install typst`, `cargo install typst-cli`, or your package manager

## Usage

Compile a cheat sheet to PDF:

```sh
typst compile ghostty.typ ghostty.pdf
```

For live preview while editing:

```sh
typst watch ghostty.typ ghostty.pdf
```

## Adding a new app

1. Create `data/<app>.yaml` with keybinding data:

```yaml
app: App Name
subtitle: Description
sections:
  - name: Section Name
    entries:
      - keys: ["⌘", "N"]
        action: Do something
```

2. Create `<app>.typ` entry point:

```typst
#import "template/cheatsheet.typ": cheatsheet, keybinding-sections

#show: cheatsheet.with(
  title: "App Name",
  subtitle: "Description",
)

#keybinding-sections(yaml("data/<app>.yaml"))
```

3. Compile: `typst compile <app>.typ <app>.pdf`

## Project structure

```
keyatlas/
├── data/           # Keybinding data (YAML, one file per app)
├── template/       # Reusable Typst template
├── ghostty.typ     # Entry point for Ghostty cheat sheet
└── ghostty.md      # Original Markdown reference
```
