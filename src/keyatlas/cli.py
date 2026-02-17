"""CLI for compiling KeyAtlas cheat sheets from YAML data."""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

ENTRY_TEMPLATE = """\
#import "template/cheatsheet.typ": cheatsheet, keybinding-sections

#let data = yaml("{yaml_path}")

#show: cheatsheet.with(
  title: data.app,
  subtitle: data.at("subtitle", default: none),
  paper: data.at("paper", default: "us-letter"),
  columns: data.at("columns", default: 3),
)

#keybinding-sections(data)
"""


def compile_one(yaml_path: Path, output_path: Path) -> bool:
    """Compile a single YAML file to PDF. Returns True on success."""
    try:
        rel_yaml = yaml_path.relative_to(PROJECT_ROOT)
    except ValueError:
        rel_yaml = os.path.relpath(yaml_path, PROJECT_ROOT)

    typ_content = ENTRY_TEMPLATE.format(yaml_path=Path(rel_yaml).as_posix())

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
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output PDF path (only valid with a single input file)",
    )
    args = parser.parse_args()

    if shutil.which("typst") is None:
        print(
            "Error: typst CLI not found. Install it from https://github.com/typst/typst",
            file=sys.stderr,
        )
        sys.exit(1)

    # Resolve input files: use args or default to all YAML in data/
    yaml_files: list[Path] = []
    if args.yaml_files:
        for p in args.yaml_files:
            resolved = p.resolve()
            if not resolved.exists():
                print(f"Error: {resolved} not found", file=sys.stderr)
                sys.exit(1)
            yaml_files.append(resolved)
    else:
        data_dir = PROJECT_ROOT / "data"
        yaml_files = sorted(data_dir.glob("*.yaml"))
        if not yaml_files:
            print(f"No YAML files found in {data_dir}", file=sys.stderr)
            sys.exit(1)

    if args.output and len(yaml_files) > 1:
        print("Error: -o/--output can only be used with a single input file", file=sys.stderr)
        sys.exit(1)

    failures = 0
    for yaml_path in yaml_files:
        output_path = args.output or Path.cwd() / f"{yaml_path.stem}.pdf"
        output_path = output_path.resolve()
        if not compile_one(yaml_path, output_path):
            failures += 1

    if failures:
        print(f"\n{failures} file(s) failed to compile", file=sys.stderr)
        sys.exit(1)
