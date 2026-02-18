"""CLI for compiling KeyAtlas cheat sheets from YAML data."""

from __future__ import annotations

import argparse
import copy
import importlib.metadata
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# ── Mac-to-Windows key mapping ──────────────────────────────────────────

MAC_TO_WIN: dict[str, str] = {
    "\u2318": "Ctrl",   # ⌘ Command
    "\u2325": "Alt",    # ⌥ Option
    "\u21e7": "Shift",  # ⇧ Shift
    "\u2303": "Ctrl",   # ⌃ Control
    "\u21b5": "Enter",  # ↵ Return
    "\u232b": "Backspace",  # ⌫ Delete
    "\u238b": "Esc",    # ⎋ Escape
}


def _map_key(key: str) -> str:
    """Map a single key string from Mac to Windows."""
    return MAC_TO_WIN.get(key, key)


def _map_keys(keys: list) -> list:
    """Recursively map a key list (handles chords as nested lists)."""
    result = []
    for item in keys:
        if isinstance(item, list):
            result.append(_map_keys(item))
        else:
            result.append(_map_key(item))
    return result


def _apply_windows_keymap(data: dict) -> dict:
    """Return a copy of data with keys mapped to Windows equivalents."""
    data = copy.deepcopy(data)
    for section in data.get("sections", []):
        for entry in section.get("entries", []):
            if "win_keys" in entry:
                entry["keys"] = entry.pop("win_keys")
            else:
                entry["keys"] = _map_keys(entry["keys"])
            # Also map alt_keys if present
            if "alt_keys" in entry:
                if "win_alt_keys" in entry:
                    entry["alt_keys"] = entry.pop("win_alt_keys")
                else:
                    entry["alt_keys"] = _map_keys(entry["alt_keys"])
    return data


# ── Version detection ───────────────────────────────────────────────────

def _get_version() -> str:
    try:
        return importlib.metadata.version("keyatlas")
    except importlib.metadata.PackageNotFoundError:
        return "dev"


# ── Config resolution ───────────────────────────────────────────────────

DEFAULTS: dict[str, object] = {
    "paper": "us-letter",
    "accent-color": "#4a90d9",
    "font-scale": 1.0,
    "orientation": "landscape",
    "columns": 3,
}

# YAML field names differ from internal config keys for two settings.
_YAML_KEY: dict[str, str] = {
    "accent-color": "color",
    "font-scale": "font_scale",
}


def resolve_config(yaml_data: dict, cli_args: argparse.Namespace) -> dict:
    """Merge defaults < YAML values < CLI flags into a config dict."""
    config: dict[str, object] = {}
    for key, default in DEFAULTS.items():
        # YAML uses different field names for two settings
        yaml_key = _YAML_KEY.get(key, key)
        yaml_val = yaml_data.get(yaml_key)
        config[key] = yaml_val if yaml_val is not None else default

    # CLI overrides (only when explicitly provided)
    if cli_args.paper is not None:
        config["paper"] = cli_args.paper
    if cli_args.color is not None:
        config["accent-color"] = cli_args.color
    if cli_args.font_scale is not None:
        config["font-scale"] = cli_args.font_scale
    if cli_args.orientation is not None:
        config["orientation"] = cli_args.orientation
    if cli_args.columns is not None:
        config["columns"] = cli_args.columns

    config["version"] = _get_version()

    return config


# ── Typst entrypoint generation ─────────────────────────────────────────

def _typ_str(value: object) -> str:
    """Format a Python value as a Typst literal."""
    if value is None:
        return "none"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    # Strings: wrap in quotes
    s = str(value)
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{s}"'


def _typ_color(hex_color: str) -> str:
    """Format a hex color string as a Typst rgb() call."""
    return f'rgb("{hex_color}")'


def build_typ_content(yaml_rel_path: str, config: dict) -> str:
    """Build the Typst entrypoint source that imports the template."""
    title_expr = f'data.at("app", default: "Cheat Sheet")'
    subtitle_expr = 'data.at("subtitle", default: none)'

    paper = _typ_str(config["paper"])
    columns = config["columns"]
    accent = _typ_color(config["accent-color"])
    font_scale = config["font-scale"]
    orientation = _typ_str(config["orientation"])
    version = _typ_str(config["version"])

    return f"""\
#import "template/cheatsheet.typ": cheatsheet, keybinding-sections

#let data = yaml("{yaml_rel_path}")

#show: cheatsheet.with(
  title: {title_expr},
  subtitle: {subtitle_expr},
  paper: {paper},
  columns: {columns},
  accent-color: {accent},
  font-scale: {font_scale},
  orientation: {orientation},
  version: {version},
)

#keybinding-sections(data, accent-color: {accent})
"""


# ── Compilation ─────────────────────────────────────────────────────────

def compile_one(
    yaml_data: dict,
    yaml_name: str,
    output_path: Path,
    config: dict,
    platform: str,
) -> bool:
    """Compile a single YAML document to PDF. Returns True on success."""
    if platform == "windows":
        yaml_data = _apply_windows_keymap(yaml_data)

    # Write (possibly transformed) YAML to a temp file inside the project root
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".yaml", delete=False, dir=PROJECT_ROOT
    ) as yf:
        yaml.dump(yaml_data, yf, allow_unicode=True)
        tmp_yaml = Path(yf.name)

    try:
        try:
            rel_yaml = tmp_yaml.relative_to(PROJECT_ROOT).as_posix()
        except ValueError:
            rel_yaml = os.path.relpath(tmp_yaml, PROJECT_ROOT)

        typ_content = build_typ_content(rel_yaml, config)

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
                print(f"Error compiling {yaml_name}:", file=sys.stderr)
                print(result.stderr, file=sys.stderr)
                return False
            print(f"Compiled {output_path}")
            return True
        finally:
            tmp_typ.unlink(missing_ok=True)
    finally:
        tmp_yaml.unlink(missing_ok=True)


# ── Main ────────────────────────────────────────────────────────────────

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

    # Output: -o and -d are mutually exclusive
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
        help="Output directory for PDFs (uses {stem}.pdf naming)",
    )

    # Layout & style flags — default=None so we can detect "not provided"
    parser.add_argument(
        "-p", "--paper",
        type=str,
        default=None,
        help="Paper size (default: us-letter)",
    )
    parser.add_argument(
        "-c", "--color",
        type=str,
        default=None,
        help="Accent colour as hex string (default: #4a90d9)",
    )
    parser.add_argument(
        "-s", "--font-scale",
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
        "-n", "--columns",
        type=int,
        default=None,
        help="Number of columns (default: 3)",
    )
    parser.add_argument(
        "--platform",
        choices=["mac", "windows", "both"],
        default="mac",
        help="Target platform for key labels (default: mac)",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {_get_version()}",
    )

    args = parser.parse_args()

    if shutil.which("typst") is None:
        print(
            "Error: typst CLI not found. Install it from https://github.com/typst/typst",
            file=sys.stderr,
        )
        sys.exit(1)

    # ── Resolve input files ──────────────────────────────────────────
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
        print(
            "Error: -o/--output can only be used with a single input file",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.output and args.platform == "both":
        print(
            "Error: -o/--output cannot be used with --platform both "
            "(two PDFs would share the same output path)",
            file=sys.stderr,
        )
        sys.exit(1)

    # ── Output directory setup ───────────────────────────────────────
    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)

    # ── Determine platforms to build ─────────────────────────────────
    platforms: list[str] = (
        ["mac", "windows"] if args.platform == "both" else [args.platform]
    )

    # ── Compile each file ────────────────────────────────────────────
    failures = 0
    for yaml_path in yaml_files:
        # Read YAML once to resolve config
        with open(yaml_path, "r", encoding="utf-8") as fh:
            yaml_data = yaml.safe_load(fh)

        config = resolve_config(yaml_data, args)

        for platform in platforms:
            # Determine output path
            if args.output:
                output_path = args.output.resolve()
            elif args.output_dir:
                if len(platforms) > 1:
                    filename = f"{yaml_path.stem}-{platform}.pdf"
                else:
                    filename = f"{yaml_path.stem}.pdf"
                output_path = args.output_dir.resolve() / filename
            else:
                if len(platforms) > 1:
                    filename = f"{yaml_path.stem}-{platform}.pdf"
                else:
                    filename = f"{yaml_path.stem}.pdf"
                output_path = Path.cwd() / filename

            if not compile_one(yaml_data, yaml_path.name, output_path, config, platform):
                failures += 1

    if failures:
        print(f"\n{failures} file(s) failed to compile", file=sys.stderr)
        sys.exit(1)
