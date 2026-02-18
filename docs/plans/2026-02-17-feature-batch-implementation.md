# Feature Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade KeyAtlas with CLI overrides, output directory support, chord shortcuts, Windows keymaps, JSON schema, and a Swiss-style design refresh.

**Architecture:** The CLI (`src/keyatlas/cli.py`) gains new argparse flags and a config-merging layer that resolves CLI > YAML > default precedence. Platform mapping transforms keys at the Python level before generating the Typst entrypoint. The Typst template (`template/cheatsheet.typ`) gains new parameters and a complete visual overhaul. A JSON Schema file documents the YAML format for IDE validation.

**Tech Stack:** Python 3.13 (stdlib only), Typst, argparse, `importlib.metadata`

**Working directory:** `/Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch`

---

### Task 1: Add CLI flags and config merging

**Files:**
- Modify: `src/keyatlas/cli.py`

**Context:** Currently the CLI has only `yaml_files` (positional) and `-o/--output`. We need to add `--paper`, `--color`, `--font-scale`, `--orientation`, `--columns`, `--output-dir`, and `--platform`. The `-o` and `--output-dir` flags are mutually exclusive.

**Step 1: Add new argparse arguments**

In `src/keyatlas/cli.py`, replace the argument parsing section (lines 61-77) with:

```python
def main() -> None:
    parser = argparse.ArgumentParser(
        prog="keyatlas",
        description="Compile keybinding cheat sheet PDFs from YAML files.",
    )
    parser.add_argument(
        "yaml_files",
        type=Path,
        nargs="*",
        help="YAML data files to compile (default: all *.yaml in data/)",
    )
    output_group = parser.add_mutually_exclusive_group()
    output_group.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output PDF path (only valid with a single input file)",
    )
    output_group.add_argument(
        "-d",
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory for generated PDFs (default: current directory)",
    )
    parser.add_argument(
        "-p", "--paper", default=None, help="Paper size (default: us-letter)"
    )
    parser.add_argument(
        "-c", "--color", default=None, help="Accent color as hex (default: #4a90d9)"
    )
    parser.add_argument(
        "-s",
        "--font-scale",
        type=float,
        default=None,
        help="Font scale multiplier (default: 1.0)",
    )
    parser.add_argument(
        "--orientation",
        choices=["landscape", "portrait"],
        default=None,
        help="Page orientation (default: landscape)",
    )
    parser.add_argument(
        "-n", "--columns", type=int, default=None, help="Number of columns (default: 3)"
    )
    parser.add_argument(
        "--platform",
        choices=["mac", "windows", "both"],
        default="mac",
        help="Target platform for key symbols (default: mac)",
    )
    args = parser.parse_args()
```

**Step 2: Add config resolution helper**

Add a helper function above `compile_one` that merges CLI flags with YAML data values:

```python
import yaml as _yaml_mod  # NO — stdlib only! Use the existing yaml loading via Typst.
```

Wait — the project uses Typst's built-in `yaml()` to load data, not Python. The CLI never reads YAML content in Python. To implement CLI-over-YAML precedence, we need to read the YAML in Python too.

Add this import and helper:

```python
from xml.etree.ElementTree import Element  # not needed, just showing stdlib
```

Actually, Python stdlib doesn't include a YAML parser. The project currently delegates YAML parsing entirely to Typst. Two approaches:

**Option A:** Add `pyyaml` as a dependency to read YAML in Python for config merging.
**Option B:** Keep YAML parsing in Typst. Pass CLI overrides to the Typst template, and let the template resolve precedence (CLI params override YAML `data.at()` calls).

**Go with Option B** — it keeps the zero-dependency constraint. The generated `.typ` entrypoint passes CLI values as explicit parameters, and the template uses them with fallback to YAML values.

Update `ENTRY_TEMPLATE` and `compile_one` to accept and pass config overrides:

```python
DEFAULTS = {
    "paper": "us-letter",
    "color": "#4a90d9",
    "font_scale": 1.0,
    "orientation": "landscape",
    "columns": 3,
}

ENTRY_TEMPLATE = """\
#import "template/cheatsheet.typ": cheatsheet, keybinding-sections

#let data = yaml("{yaml_path}")

#show: cheatsheet.with(
  title: data.app,
  subtitle: data.at("subtitle", default: none),
  paper: {paper},
  accent-color: rgb("{color}"),
  font-scale: {font_scale},
  orientation: "{orientation}",
  columns: {columns},
  version: "{version}",
)

#keybinding-sections(data, accent-color: rgb("{color}"))
"""
```

For the config precedence: CLI flag (if not None) > YAML value (read via Typst `data.at()`) > built-in default. Since we can't read YAML in Python, we use a Typst-level override approach:

- If a CLI flag is provided, pass it as a literal value in the generated `.typ` file.
- If a CLI flag is NOT provided (None), use the Typst `data.at("field", default: X)` expression in the template.

This means the template string needs conditional formatting. Refactor:

```python
def build_typ_content(yaml_path: str, overrides: dict, version: str) -> str:
    """Build the Typst entrypoint content with CLI overrides."""
    lines = [
        '#import "template/cheatsheet.typ": cheatsheet, keybinding-sections',
        "",
        f'#let data = yaml("{yaml_path}")',
        "",
    ]

    # Resolve each config value: CLI override or Typst data.at() fallback
    def val(key, yaml_key, default, fmt="str"):
        cli_val = overrides.get(key)
        if cli_val is not None:
            if fmt == "str":
                return f'"{cli_val}"'
            elif fmt == "float":
                return str(cli_val)
            elif fmt == "int":
                return str(cli_val)
            elif fmt == "color":
                return f'rgb("{cli_val}")'
        else:
            if fmt == "str":
                return f'data.at("{yaml_key}", default: "{default}")'
            elif fmt == "float":
                return f'data.at("{yaml_key}", default: {default})'
            elif fmt == "int":
                return f'data.at("{yaml_key}", default: {default})'
            elif fmt == "color":
                return f'rgb(data.at("{yaml_key}", default: "{default}"))'

    paper = val("paper", "paper", "us-letter")
    color = val("color", "color", "#4a90d9", "color")
    font_scale = val("font_scale", "font_scale", 1.0, "float")
    orientation = val("orientation", "orientation", "landscape")
    columns = val("columns", "columns", 3, "int")

    lines.append("#show: cheatsheet.with(")
    lines.append("  title: data.app,")
    lines.append('  subtitle: data.at("subtitle", default: none),')
    lines.append(f"  paper: {paper},")
    lines.append(f"  accent-color: {color},")
    lines.append(f"  font-scale: {font_scale},")
    lines.append(f"  orientation: {orientation},")
    lines.append(f"  columns: {columns},")
    lines.append(f'  version: "{version}",')
    lines.append(")")
    lines.append("")
    lines.append(f"#keybinding-sections(data, accent-color: {color})")
    lines.append("")

    return "\n".join(lines)
```

**Step 3: Update `compile_one` signature**

```python
def compile_one(yaml_path: Path, output_path: Path, overrides: dict, version: str) -> bool:
    """Compile a single YAML file to PDF. Returns True on success."""
    try:
        rel_yaml = yaml_path.relative_to(PROJECT_ROOT)
    except ValueError:
        rel_yaml = os.path.relpath(yaml_path, PROJECT_ROOT)

    typ_content = build_typ_content(Path(rel_yaml).as_posix(), overrides, version)

    # ... rest unchanged (tempfile write, typst compile, cleanup)
```

**Step 4: Update `main()` to pass overrides and handle output-dir**

After argument parsing and file resolution:

```python
    from importlib.metadata import version as pkg_version
    try:
        version = pkg_version("keyatlas")
    except Exception:
        version = "dev"

    overrides = {
        "paper": args.paper,
        "color": args.color,
        "font_scale": args.font_scale,
        "orientation": args.orientation,
        "columns": args.columns,
    }

    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)

    failures = 0
    for yaml_path in yaml_files:
        if args.output:
            output_path = args.output
        elif args.output_dir:
            output_path = args.output_dir / f"{yaml_path.stem}.pdf"
        else:
            output_path = Path.cwd() / f"{yaml_path.stem}.pdf"
        output_path = output_path.resolve()
        if not compile_one(yaml_path, output_path, overrides, version):
            failures += 1
```

**Step 5: Verify compilation still works**

Run: `cd /Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch && uv run keyatlas`

Expected: All 4 PDFs compile successfully. (The template doesn't accept the new params yet — that's Task 2. So for this step, use the OLD template string that doesn't pass the new params, and only wire up the plumbing. We'll update the template call in Task 6 when the template is ready.)

**Revised approach:** For Task 1, keep `ENTRY_TEMPLATE` passing only the currently-supported params (paper, columns). Add `build_typ_content` but don't use it yet. Wire up all the argparse flags and output-dir logic. The `build_typ_content` function will be activated in Task 6 when the template gains the new parameters.

Actually, let's keep it simpler. For Task 1:
1. Add all argparse flags
2. Wire up `--output-dir` (this works immediately since it only affects output path)
3. Pass `overrides` dict through to `compile_one` but don't use it yet in the template
4. Add version detection

**Step 6: Commit**

```bash
git add src/keyatlas/cli.py
git commit -m "feat: add CLI flags for paper, color, font-scale, orientation, columns, output-dir, platform"
```

---

### Task 2: Migrate chord shortcuts in YAML data files

**Files:**
- Modify: `data/vscode-general.yaml`
- Modify: `data/vscode-editing.yaml`
- Modify: `data/vscode-navigation.yaml`

**Context:** Chords are currently encoded as flat strings with combined modifier+key (e.g., `["⌘K", "⌘S"]`). Migrate to nested lists: `[["⌘", "K"], ["⌘", "S"]]`.

**Step 1: Migrate `data/vscode-general.yaml`**

Replace these entries:

| Line | Old | New |
|------|-----|-----|
| 13 | `["⌘K", "⌘S"]` | `[["⌘", "K"], ["⌘", "S"]]` |
| 35 | `["⌘K", "Z"]` | `[["⌘", "K"], ["Z"]]` |
| 52 | `["⌘K", "⌘W"]` | `[["⌘", "K"], ["⌘", "W"]]` |
| 58 | `["⌘K", "↵"]` | `[["⌘", "K"], ["↵"]]` |
| 68 | `["⌘K", "⌘←"]` | `[["⌘", "K"], ["⌘", "←"]]` |
| 70 | `["⌘K", "⌘→"]` | `[["⌘", "K"], ["⌘", "→"]]` |

**Step 2: Migrate `data/vscode-editing.yaml`**

| Line | Old | New |
|------|-----|-----|
| 44 | `["⌘K", "⌘F"]` | `[["⌘", "K"], ["⌘", "F"]]` |
| 62 | `["⌘K", "⌘D"]` | `[["⌘", "K"], ["⌘", "D"]]` |
| 77 | `["⌘K", "F12"]` | `[["⌘", "K"], ["F12"]]` |
| 95 | `["⌘K", "⌘0"]` | `[["⌘", "K"], ["⌘", "0"]]` |
| 97 | `["⌘K", "⌘J"]` | `[["⌘", "K"], ["⌘", "J"]]` |
| 99 | `["⌘K", "⌘1"]` | `[["⌘", "K"], ["⌘", "1"]]` |

**Step 3: Migrate `data/vscode-navigation.yaml`**

| Line | Old | New |
|------|-----|-----|
| 63 | `["⌘K", "⌥⌘S"]` | `[["⌘", "K"], ["⌥", "⌘", "S"]]` |

**Step 4: Commit**

```bash
git add data/vscode-general.yaml data/vscode-editing.yaml data/vscode-navigation.yaml
git commit -m "refactor: migrate chord shortcuts to nested list format"
```

Note: After this commit, existing compilation will break because the Typst template's `render-keys` doesn't handle nested lists yet. This is fixed in Task 3.

---

### Task 3: Update Typst template for chord rendering

**Files:**
- Modify: `template/cheatsheet.typ`

**Context:** The `render-keys` function currently joins all keys with `+`. It needs to detect nested lists (chords) and render steps separated by a comma instead.

**Step 1: Update `render-keys` to handle chords**

Replace the `render-keys` function (line 41-43) with:

```typst
#let render-keys(keys) = {
  // Detect chord: if first element is an array, treat as multi-step
  if type(keys.first()) == array {
    // Chord: render each step, join with comma separator
    keys.map(step =>
      step.map(k => box(baseline: 30%, kbd(k))).join(
        box(inset: (left: 3pt, right: 2pt), text(size: 9pt, fill: luma(140), "+"))
      )
    ).join(
      box(inset: (left: 4pt, right: 3pt), text(size: 9pt, fill: luma(140), ","))
    )
  } else {
    // Simple shortcut: join with +
    keys.map(k => box(baseline: 30%, kbd(k))).join(
      box(inset: (left: 3pt, right: 2pt), text(size: 9pt, fill: luma(140), "+"))
    )
  }
}
```

**Step 2: Verify compilation works with migrated data**

Run: `cd /Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch && uv run keyatlas`

Expected: All 4 PDFs compile. Chord shortcuts render with comma separators.

**Step 3: Visually inspect a chord-heavy PDF**

Run: `open vscode-general.pdf`

Verify: "Open Keyboard Shortcuts" shows `⌘+K , ⌘+S` (not `⌘K+⌘S`).

**Step 4: Commit**

```bash
git add template/cheatsheet.typ
git commit -m "feat: support chord shortcuts with comma-separated rendering"
```

---

### Task 4: Add Windows keymap support

**Files:**
- Modify: `src/keyatlas/cli.py`

**Context:** Add a MAC_TO_WIN mapping dict and a function to transform key lists for Windows platform. When `--platform windows`, transform keys before generating the Typst entrypoint. When `--platform both`, generate two PDFs per input.

**Step 1: Add the mapping table and transform function**

Add after `PROJECT_ROOT` definition in `cli.py`:

```python
MAC_TO_WIN: dict[str, str] = {
    "⌘": "Ctrl",
    "⌥": "Alt",
    "⇧": "Shift",
    "⌃": "Ctrl",
    "↵": "Enter",
    "⌫": "Backspace",
    "⎋": "Esc",
}


def map_key_to_windows(key: str) -> str:
    """Map a single macOS key symbol to its Windows equivalent."""
    # Handle combined modifier+key strings (e.g., "⌘K" → "CtrlK")
    # But these should be migrated to nested format already.
    return MAC_TO_WIN.get(key, key)


def map_keys_to_platform(keys: list, platform: str) -> list:
    """Transform a keys list for the target platform."""
    if platform == "mac":
        return keys
    # keys can be flat ["⌘", "S"] or nested [["⌘", "K"], ["⌘", "S"]]
    if keys and isinstance(keys[0], list):
        return [[map_key_to_windows(k) for k in step] for step in keys]
    return [map_key_to_windows(k) for k in keys]


def transform_entry_for_platform(entry: dict, platform: str) -> dict:
    """Return a copy of entry with keys resolved for the given platform."""
    result = dict(entry)
    if platform == "windows" and "win_keys" in entry:
        result["keys"] = entry["win_keys"]
    elif platform == "windows":
        result["keys"] = map_keys_to_platform(entry["keys"], platform)
    # For mac, keys stay as-is
    if "win_keys" in result:
        del result["win_keys"]
    if "alt_keys" in result and platform == "windows":
        result["alt_keys"] = map_keys_to_platform(entry["alt_keys"], platform)
    return result
```

Wait — the key transform happens at the Python level, but Python never reads the YAML. The YAML is read by Typst. So we can't transform keys in Python.

**Revised approach:** We need to read the YAML in Python to do platform mapping. This means adding `pyyaml` as a dependency, OR using Python's stdlib to load YAML (there's no stdlib YAML parser).

**Alternative:** Write the transformed YAML to a temp file, then pass that to Typst. This requires reading the YAML in Python.

**Simplest correct approach:** Add `pyyaml` as a dependency. It's the only runtime dependency needed. The project already uses `hatchling` for build, so adding one dep is minimal.

Actually — Python 3.13 stdlib doesn't have YAML, but we could use a simple approach: since the YAML files are simple and don't use advanced features, we can use a minimal YAML-subset reader. But that's fragile. Let's just add `pyyaml`.

**Step 1a: Add pyyaml dependency**

In `pyproject.toml`, change:
```
dependencies = []
```
to:
```
dependencies = ["pyyaml>=6.0"]
```

Run: `cd /Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch && uv sync`

**Step 1b: Refactor `compile_one` to read YAML in Python**

Now that we can read YAML in Python, refactor the entire flow:
1. Python reads the YAML file
2. Python applies platform key transforms
3. Python resolves config (CLI > YAML > defaults)
4. Python writes a transformed YAML temp file
5. Generated `.typ` reads the transformed temp YAML

This is cleaner than conditional Typst expressions.

```python
import yaml

def load_and_transform(yaml_path: Path, platform: str) -> dict:
    """Load YAML data and transform keys for the target platform."""
    with open(yaml_path) as f:
        data = yaml.safe_load(f)

    if platform == "mac":
        return data

    for section in data.get("sections", []):
        for entry in section.get("entries", []):
            if platform == "windows" and "win_keys" in entry:
                entry["keys"] = entry.pop("win_keys")
            elif platform == "windows":
                entry["keys"] = map_keys_to_platform(entry["keys"], platform)
            else:
                entry.pop("win_keys", None)

            if "win_keys" in entry:
                del entry["win_keys"]

            if "alt_keys" in entry and platform == "windows":
                entry["alt_keys"] = map_keys_to_platform(entry["alt_keys"], platform)

    return data


def resolve_config(data: dict, overrides: dict) -> dict:
    """Resolve config values: CLI override > YAML value > default."""
    return {
        "paper": overrides.get("paper") or data.get("paper", DEFAULTS["paper"]),
        "color": overrides.get("color") or data.get("color", DEFAULTS["color"]),
        "font_scale": overrides.get("font_scale") if overrides.get("font_scale") is not None else data.get("font_scale", DEFAULTS["font_scale"]),
        "orientation": overrides.get("orientation") or data.get("orientation", DEFAULTS["orientation"]),
        "columns": overrides.get("columns") if overrides.get("columns") is not None else data.get("columns", DEFAULTS["columns"]),
    }
```

**Step 1c: Rewrite `compile_one` to use the new flow**

```python
def compile_one(yaml_path: Path, output_path: Path, overrides: dict, version: str, platform: str = "mac") -> bool:
    """Compile a single YAML file to PDF. Returns True on success."""
    data = load_and_transform(yaml_path, platform)
    config = resolve_config(data, overrides)

    # Write transformed data to temp YAML
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".yaml", delete=False, dir=PROJECT_ROOT
    ) as yf:
        yaml.safe_dump(data, yf, allow_unicode=True)
        tmp_yaml = Path(yf.name)

    try:
        rel_yaml = tmp_yaml.relative_to(PROJECT_ROOT)
    except ValueError:
        rel_yaml = Path(os.path.relpath(tmp_yaml, PROJECT_ROOT))

    typ_content = build_typ_content(rel_yaml.as_posix(), config, version)

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".typ", delete=False, dir=PROJECT_ROOT
    ) as f:
        f.write(typ_content)
        tmp_typ = Path(f.name)

    try:
        result = subprocess.run(
            ["typst", "compile", str(tmp_typ), str(output_path)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"Error compiling {yaml_path.name}:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            return False
        print(f"Compiled {output_path}")
        return True
    finally:
        tmp_typ.unlink(missing_ok=True)
        tmp_yaml.unlink(missing_ok=True)
```

**Step 1d: Simplified `build_typ_content`**

Since config is now fully resolved in Python:

```python
def build_typ_content(yaml_path: str, config: dict, version: str) -> str:
    """Build the Typst entrypoint content."""
    return f'''\
#import "template/cheatsheet.typ": cheatsheet, keybinding-sections

#let data = yaml("{yaml_path}")

#show: cheatsheet.with(
  title: data.app,
  subtitle: data.at("subtitle", default: none),
  paper: "{config["paper"]}",
  accent-color: rgb("{config["color"]}"),
  font-scale: {config["font_scale"]},
  orientation: "{config["orientation"]}",
  columns: {config["columns"]},
  version: "{version}",
)

#keybinding-sections(data, accent-color: rgb("{config["color"]}"))
'''
```

**Step 2: Handle `--platform both` in `main()`**

```python
    failures = 0
    for yaml_path in yaml_files:
        platforms = ["mac", "windows"] if args.platform == "both" else [args.platform]
        for platform in platforms:
            suffix = f"-{platform}" if args.platform == "both" else ""
            if args.output:
                output_path = args.output
            elif args.output_dir:
                output_path = args.output_dir / f"{yaml_path.stem}{suffix}.pdf"
            else:
                output_path = Path.cwd() / f"{yaml_path.stem}{suffix}.pdf"
            output_path = output_path.resolve()
            if not compile_one(yaml_path, output_path, overrides, version, platform):
                failures += 1
```

**Step 3: Verify compilation**

Run: `cd /Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch && uv sync && uv run keyatlas`

Expected: All 4 PDFs compile. No visual changes (mac platform is default).

Run: `uv run keyatlas data/ghostty.yaml --platform windows -d /tmp/keyatlas-test`

Expected: `/tmp/keyatlas-test/ghostty.pdf` generated with Ctrl/Alt/Shift instead of ⌘/⌥/⇧.

Run: `uv run keyatlas data/ghostty.yaml --platform both -d /tmp/keyatlas-test`

Expected: `ghostty-mac.pdf` and `ghostty-win.pdf` both generated.

**Step 4: Commit**

```bash
git add pyproject.toml uv.lock src/keyatlas/cli.py
git commit -m "feat: add Windows keymap support with auto-mapping and --platform flag"
```

---

### Task 5: Update Typst template to accept new parameters

**Files:**
- Modify: `template/cheatsheet.typ`

**Context:** The template needs to accept `font-scale`, `orientation`, and `version` parameters. The `accent-color` is already a parameter but needs to be consistently threaded through. This task updates the template function signatures; the design refresh (Task 7) will change the visual styling.

**Step 1: Update `cheatsheet` function signature**

Replace lines 5-11 of `template/cheatsheet.typ`:

```typst
#let cheatsheet(
  title: "Cheat Sheet",
  subtitle: none,
  accent-color: rgb("#4a90d9"),
  paper: "us-letter",
  columns: 3,
  font-scale: 1.0,
  orientation: "landscape",
  version: none,
  body,
) = {
```

**Step 2: Apply font-scale and orientation**

Replace lines 13-19:

```typst
  let base-size = 8.5pt * font-scale
  set document(title: title)
  set page(
    paper: paper,
    flipped: orientation == "landscape",
    margin: (x: 0.8cm, y: 0.6cm),
    columns: columns,
  )
  set text(font: "Helvetica Neue", size: base-size)
  set par(leading: 0.45em)
```

**Step 3: Scale title and subtitle sizes proportionally**

Replace the title block text sizes to use `font-scale`:

```typst
  block(
    width: 100%,
    inset: (bottom: 4pt),
    {
      text(size: 16pt * font-scale, weight: "bold", fill: accent-color, title)
      if subtitle != none {
        linebreak()
        text(size: 9pt * font-scale, fill: luma(100), subtitle)
      }
      v(2pt)
      line(length: 100%, stroke: 0.5pt + accent-color)
    },
  )
```

**Step 4: Add version footer**

Before `body` at the end of the `cheatsheet` function, add a footer via page set rule:

```typst
  // Version footer
  if version != none {
    set page(footer: align(right, text(size: 6pt * font-scale, fill: luma(180), [keyatlas v#version])))
  }

  body
```

**Step 5: Scale sizes in render-entry and keybinding-section**

The `render-entry` and `keybinding-section` functions use hardcoded sizes (10pt, 9pt). These need to scale too. But they don't receive `font-scale` as a parameter.

**Approach:** Use a Typst state variable or pass font-scale through. Simplest: use the document's base text size (already set) and use relative sizing with `1em`, `0.9em` etc. Or — pass `font-scale` through all functions.

**Simplest approach:** Since `set text(size: base-size)` is already applied, the body inherits it. Adjust the hardcoded sizes in render functions to be relative to the base:

- `10pt` → `1.18em` (10/8.5 ≈ 1.18)
- `9pt` → `1.06em` (9/8.5 ≈ 1.06)
- `16pt` → already scaled above

Actually, this is over-engineered. The `set text(size: base-size)` sets the context. Sub-functions that use absolute `pt` sizes won't scale. But the font-scale feature is meant to uniformly scale everything. So either:
- Convert all `pt` sizes to `em` units (cleanest)
- Pass `font-scale` to every function

**Go with em units** for the entry/section functions:

In `render-keys` (line 42-43), change `size: 9pt` to `size: 1.06em`.
In `render-entry` (line 55), change `size: 10pt` to `size: 1.18em`.
In `render-entry` (lines 59, 63), change `size: 9pt` to `size: 1.06em`.
In `keybinding-section` (line 85), change `size: 10pt` to `size: 1.18em`.

**Step 6: Verify compilation**

Run: `cd /Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch && uv run keyatlas`

Expected: All 4 PDFs compile. Visual output should look identical to before (font-scale defaults to 1.0).

Test font scaling:
Run: `uv run keyatlas data/ghostty.yaml --font-scale 1.3 -o /tmp/ghostty-large.pdf`

Expected: Visibly larger text throughout.

Test orientation:
Run: `uv run keyatlas data/ghostty.yaml --orientation portrait -o /tmp/ghostty-portrait.pdf`

Expected: Portrait layout.

**Step 7: Commit**

```bash
git add template/cheatsheet.typ
git commit -m "feat: add font-scale, orientation, and version parameters to template"
```

---

### Task 6: Create JSON Schema

**Files:**
- Create: `schema/keyatlas.schema.json`

**Step 1: Write the schema**

Create `schema/keyatlas.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/gillisandrew/keyatlas/raw/main/schema/keyatlas.schema.json",
  "title": "KeyAtlas Cheat Sheet",
  "description": "Schema for KeyAtlas YAML keybinding data files",
  "type": "object",
  "required": ["app", "sections"],
  "additionalProperties": false,
  "properties": {
    "app": {
      "type": "string",
      "description": "Application name, displayed as the cheat sheet title"
    },
    "subtitle": {
      "type": "string",
      "description": "Optional subtitle displayed below the title"
    },
    "paper": {
      "type": "string",
      "default": "us-letter",
      "description": "Paper size (any Typst paper size string)"
    },
    "columns": {
      "type": "integer",
      "minimum": 1,
      "maximum": 6,
      "default": 3,
      "description": "Number of layout columns"
    },
    "color": {
      "type": "string",
      "pattern": "^#[0-9a-fA-F]{6}$",
      "default": "#4a90d9",
      "description": "Accent color as hex (e.g. #4a90d9)"
    },
    "font_scale": {
      "type": "number",
      "minimum": 0.5,
      "maximum": 2.0,
      "default": 1.0,
      "description": "Font size multiplier"
    },
    "orientation": {
      "type": "string",
      "enum": ["landscape", "portrait"],
      "default": "landscape",
      "description": "Page orientation"
    },
    "sections": {
      "type": "array",
      "minItems": 1,
      "description": "Keybinding sections",
      "items": {
        "type": "object",
        "required": ["name", "entries"],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "description": "Section heading"
          },
          "entries": {
            "type": "array",
            "minItems": 1,
            "description": "Keybinding entries in this section",
            "items": {
              "$ref": "#/$defs/entry"
            }
          }
        }
      }
    }
  },
  "$defs": {
    "keyCombo": {
      "description": "A key combination: array of key strings",
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "keysField": {
      "description": "Simple key combo or chord (list of combos)",
      "oneOf": [
        { "$ref": "#/$defs/keyCombo" },
        {
          "type": "array",
          "items": { "$ref": "#/$defs/keyCombo" },
          "minItems": 2,
          "description": "Chord: sequence of key combos"
        }
      ]
    },
    "entry": {
      "type": "object",
      "required": ["keys", "action"],
      "additionalProperties": false,
      "properties": {
        "keys": { "$ref": "#/$defs/keysField" },
        "win_keys": { "$ref": "#/$defs/keysField" },
        "alt_keys": { "$ref": "#/$defs/keyCombo" },
        "range": { "$ref": "#/$defs/keyCombo" },
        "action": {
          "type": "string",
          "description": "Description of what the shortcut does"
        }
      }
    }
  }
}
```

**Step 2: Add schema reference to YAML files**

Add a `# yaml-language-server` comment to each YAML file's first line for VS Code YAML extension support:

```yaml
# yaml-language-server: $schema=../schema/keyatlas.schema.json
```

Add this line to the top of:
- `data/ghostty.yaml`
- `data/vscode-general.yaml`
- `data/vscode-editing.yaml`
- `data/vscode-navigation.yaml`

**Step 3: Verify schema validates existing files**

This is optional and requires a JSON Schema validator. Skip for now — IDE validation is the primary use case.

**Step 4: Commit**

```bash
git add schema/keyatlas.schema.json data/*.yaml
git commit -m "feat: add JSON Schema for YAML input validation"
```

---

### Task 7: Design refresh (Swiss/International Style)

**Files:**
- Modify: `template/cheatsheet.typ`

**Context:** Complete visual overhaul. This is the most subjective task. The template replaces the current design entirely with Swiss/International Style: large overlapping title, accent color tints, stripe section headers, hairline column rules, airy spacing.

**Step 1: Rewrite the `cheatsheet` function**

Replace the entire `cheatsheet` function with the new Swiss-style layout:

```typst
#let cheatsheet(
  title: "Cheat Sheet",
  subtitle: none,
  accent-color: rgb("#4a90d9"),
  paper: "us-letter",
  columns: 3,
  font-scale: 1.0,
  orientation: "landscape",
  version: none,
  body,
) = {
  let base-size = 8.5pt * font-scale
  set document(title: title)
  set page(
    paper: paper,
    flipped: orientation == "landscape",
    margin: (x: 1cm, y: 0.8cm),
    columns: columns,
    column-gutter: 12pt,
    footer: if version != none {
      align(right, text(size: 6pt * font-scale, fill: luma(200), [keyatlas v#version]))
    },
    background: {
      // Large decorative title — semi-transparent behind content
      place(
        top + left,
        dx: 0.6cm,
        dy: 0.4cm,
        text(
          size: 48pt * font-scale,
          weight: "bold",
          fill: accent-color.lighten(85%),
          tracking: 0.05em,
          title,
        ),
      )
    },
  )
  set text(font: "Helvetica Neue", size: base-size)
  set par(leading: 0.5em)

  // Title block
  block(
    width: 100%,
    inset: (bottom: 6pt),
    {
      text(size: 14pt * font-scale, weight: "bold", fill: accent-color, title)
      if subtitle != none {
        h(8pt)
        text(size: 8pt * font-scale, fill: luma(140), subtitle)
      }
      v(4pt)
      line(length: 100%, stroke: 0.75pt + accent-color.lighten(40%))
    },
  )
  v(2pt)

  body
}
```

**Step 2: Redesign `render-entry`**

Replace with accent-tinted alternating rows:

```typst
#let render-entry(entry, bg, accent-color: rgb("#4a90d9")) = {
  block(
    width: 100%,
    fill: bg,
    inset: (x: 6pt, y: 2.5pt),
    radius: 1.5pt,
    grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      gutter: 6pt,
      text(size: 1.18em, entry.action),
      {
        render-keys(entry.keys)
        if "alt_keys" in entry {
          box(inset: (left: 3pt, right: 2pt), text(size: 1.06em, fill: luma(160), "/"))
          render-keys(entry.alt_keys)
        }
        if "range" in entry {
          box(inset: (left: 3pt, right: 2pt), text(size: 1.06em, fill: luma(160), "–"))
          render-keys(entry.range)
        }
      },
    ),
  )
}
```

**Step 3: Redesign `keybinding-section` with stripe header**

Replace with left-border stripe and uppercase tracking:

```typst
#let keybinding-section(name, entries, accent-color: rgb("#4a90d9")) = {
  let peek = calc.min(entries.len(), 2)
  block(
    width: 100%,
    breakable: false,
    {
      // Section header — left accent stripe, uppercase tracking
      block(
        width: 100%,
        stroke: (left: 2.5pt + accent-color),
        inset: (left: 8pt, y: 3pt, right: 5pt),
        text(
          weight: "bold",
          size: 1.06em,
          fill: accent-color.darken(10%),
          tracking: 0.08em,
          upper(name),
        ),
      )
      v(3pt)
      for i in range(peek) {
        let bg = if calc.rem(i, 2) == 0 { accent-color.lighten(95%) } else { white }
        render-entry(entries.at(i), bg, accent-color: accent-color)
      }
    },
  )
  for i in range(peek, entries.len()) {
    let bg = if calc.rem(i, 2) == 0 { accent-color.lighten(95%) } else { white }
    render-entry(entries.at(i), bg, accent-color: accent-color)
  }
  v(6pt)
}
```

**Step 4: Verify compilation and visual output**

Run: `cd /Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch && uv run keyatlas`

Expected: All 4 PDFs compile with the new Swiss-style design.

Open each PDF and verify:
- Large semi-transparent title in background
- Left-stripe section headers with uppercase text
- Accent-tinted alternating rows
- Version footer in bottom-right
- Chord shortcuts render correctly with comma separators

Run: `uv run keyatlas data/ghostty.yaml --color "#e63946" -o /tmp/ghostty-red.pdf`

Expected: Red-themed cheat sheet.

**Step 5: Commit**

```bash
git add template/cheatsheet.typ
git commit -m "feat: redesign template with Swiss/International Style"
```

---

### Task 8: Update README

**Files:**
- Modify: `README.md`

**Context:** Update the README to document the new CLI flags, YAML fields, platform support, chord format, and JSON schema.

**Step 1: Update the README**

Add documentation for:
- New CLI flags table (all 7 flags with descriptions and defaults)
- Updated YAML format (new fields: `color`, `font_scale`, `orientation`, `win_keys`, chord syntax)
- Platform support (`--platform mac/windows/both`)
- JSON Schema reference
- Example commands showing new features

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with new features and CLI flags"
```

---

### Task 9: Final integration verification

**Step 1: Run full compilation with defaults**

Run: `cd /Users/gillisandrew/Projects/gillisandrew/keyatlas/.worktrees/feature-batch && uv run keyatlas`

Expected: All 4 PDFs compile successfully.

**Step 2: Test each new flag**

```bash
# Output directory
uv run keyatlas -d /tmp/keyatlas-out
ls /tmp/keyatlas-out/*.pdf  # should show 4 PDFs

# Paper size
uv run keyatlas data/ghostty.yaml --paper a4 -o /tmp/ghostty-a4.pdf

# Color override
uv run keyatlas data/ghostty.yaml --color "#2d6a4f" -o /tmp/ghostty-green.pdf

# Font scale
uv run keyatlas data/ghostty.yaml --font-scale 0.8 -o /tmp/ghostty-small.pdf

# Orientation
uv run keyatlas data/ghostty.yaml --orientation portrait -o /tmp/ghostty-portrait.pdf

# Columns
uv run keyatlas data/ghostty.yaml --columns 2 -o /tmp/ghostty-2col.pdf

# Windows platform
uv run keyatlas data/ghostty.yaml --platform windows -o /tmp/ghostty-win.pdf

# Both platforms
uv run keyatlas data/ghostty.yaml --platform both -d /tmp/keyatlas-both
ls /tmp/keyatlas-both/  # ghostty-mac.pdf, ghostty-win.pdf
```

**Step 3: Test mutual exclusion**

```bash
uv run keyatlas data/ghostty.yaml -o /tmp/test.pdf -d /tmp/out  # should error
```

Expected: argparse error about mutually exclusive args.

**Step 4: Commit any fixes**

If any tests reveal issues, fix and commit.

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | CLI flags + config plumbing | `src/keyatlas/cli.py` |
| 2 | Migrate chord data | `data/*.yaml` |
| 3 | Chord rendering in template | `template/cheatsheet.typ` |
| 4 | Windows keymap support | `src/keyatlas/cli.py`, `pyproject.toml` |
| 5 | Template new parameters | `template/cheatsheet.typ` |
| 6 | JSON Schema | `schema/keyatlas.schema.json`, `data/*.yaml` |
| 7 | Design refresh | `template/cheatsheet.typ` |
| 8 | README update | `README.md` |
| 9 | Integration verification | (all) |
