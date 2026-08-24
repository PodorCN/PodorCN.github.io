#!/usr/bin/env python3
"""Copy public macro pages and their immutable data archives into this site."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = (
    "economic_calendar.html",
    "feds-boc-watcher.html",
)
PUBLIC_TREES = (
    "economic-calendar",
    "data/economic-calendar",
    "data/fed-boc",
)


def sync(source: Path, destination: Path) -> None:
    missing = [name for name in PUBLIC_FILES + PUBLIC_TREES if not (source / name).exists()]
    if missing:
        raise FileNotFoundError(f"source is missing required public artifacts: {', '.join(missing)}")

    destination.mkdir(parents=True, exist_ok=True)
    for name in PUBLIC_FILES:
        shutil.copy2(source / name, destination / name)
    for name in PUBLIC_TREES:
        shutil.copytree(source / name, destination / name, dirs_exist_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync macro pages from thematic-market-watcher/docs")
    parser.add_argument("--source", type=Path, required=True, help="source docs directory")
    parser.add_argument("--destination", type=Path, default=SITE_ROOT / "macro")
    args = parser.parse_args()
    sync(args.source.resolve(), args.destination.resolve())
    print(f"synced macro pages to {args.destination.resolve()}")


if __name__ == "__main__":
    main()
