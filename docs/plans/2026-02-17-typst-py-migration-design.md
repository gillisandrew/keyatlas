# typst-py Migration Design

Date: 2026-02-17

## Goal

Replace the subprocess-based Typst compilation with the `typst-py` Python bindings, eliminating all temp file I/O and the system Typst CLI requirement.

## Motivation

The current `compile_one()` function:
1. Writes the transformed YAML to a temp `.yaml` file
2. Writes the generated entrypoint to a temp `.typ` file
3. Shells out to `typst compile <tmp.typ> <output.pdf>`
4. Cleans up both temp files in nested `try/finally` blocks

`typst-py` provides an embedded Typst compiler via a dict-based virtual filesystem, allowing all of this to happen in memory.

## New Compilation Flow

```python
import typst

files = {
    "main.typ":                  entrypoint_content.encode(),
    "template/cheatsheet.typ":   (PROJECT_ROOT / "template/cheatsheet.typ").read_bytes(),
    "data.yaml":                 yaml.dump(yaml_data, allow_unicode=True).encode(),
}
typst.compile(files, output=str(output_path))
```

- `"main.typ"` is the virtual entry point (must be keyed as `"main"` or `"main.typ"`)
- `"template/cheatsheet.typ"` is the template, read from disk as bytes at compile time
- `"data.yaml"` is the (possibly platform-transformed) YAML, serialised in memory

Errors raise Python exceptions, caught and printed to stderr.

## Changes

### `src/keyatlas/cli.py`

**Removals:**
- `import os` — no longer needed for `os.path.relpath`
- `import shutil` — `shutil.which("typst")` check gone
- `import subprocess` — no subprocess
- `import tempfile` — no temp files

**`build_typ_content()`:**
The YAML path is always `"data.yaml"` (fixed virtual path, no relative path computation).

**`compile_one()`:**
- No temp file creation or cleanup
- No nested `try/finally`
- Call `typst.compile(files, output=str(output_path))`
- Wrap in `try/except Exception` — print to stderr, return `False`

**`main()`:**
- Remove the `shutil.which("typst")` block entirely
- Everything else unchanged

### `pyproject.toml`

Add `typst` to `dependencies`.

### `.github/workflows/release.yml`

Remove the `typst-community/setup-typst` step — no system Typst needed.

## What Stays the Same

- All CLI flags and their behaviour
- Config resolution (CLI > YAML > default)
- Platform mapping (Windows keymaps)
- Output path logic (`-o`, `-d`, `--platform both`)
- Error reporting format (stderr, same messages)
- Template file location (`template/cheatsheet.typ` on disk)
