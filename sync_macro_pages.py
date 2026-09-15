#!/usr/bin/env python3
"""Copy public macro pages and their immutable data archives into this site.

Source is the `thematic-tracker` repository, where each macro page is a
self-contained folder at the repo root. The two pages moved there from
`thematic-market-watcher/docs` in 2026-09; the source layout, the destination
layout and the pages' own fetch URLs all changed with that move.

The allowlist below is deliberate and must stay explicit: the source folders
also hold artifacts that must never be published — the PM review evidence
chain (`fed-boc-watcher/review/`), the pre-review staging payload
(`fed-boc-watcher/data/dashboard.json`), and the fetch-stage intermediates
(`economic-calendar/raw/`). Never replace this with a whole-folder copy.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parent

# Published verbatim, relative to both the source repo root and macro/.
PUBLIC_FILES = (
    "economic-calendar/index.html",
    "economic-calendar/data/latest.json",
    "economic-calendar/data/dates.json",
    "fed-boc-watcher/index.html",
    "fed-boc-watcher/data/latest.json",
    "fed-boc-watcher/data/dates.json",
)
PUBLIC_TREES = (
    "economic-calendar/archive",
    "economic-calendar/data/archive",
    "fed-boc-watcher/data/archive",
)


def sync(source: Path, destination: Path) -> None:
    missing = [name for name in PUBLIC_FILES + PUBLIC_TREES if not (source / name).exists()]
    if missing:
        raise FileNotFoundError(f"source is missing required public artifacts: {', '.join(missing)}")

    destination.mkdir(parents=True, exist_ok=True)
    for name in PUBLIC_FILES:
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / name, target)
    for name in PUBLIC_TREES:
        shutil.copytree(source / name, destination / name, dirs_exist_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync macro pages from thematic-tracker")
    parser.add_argument("--source", type=Path, required=True, help="thematic-tracker checkout root")
    parser.add_argument("--destination", type=Path, default=SITE_ROOT / "macro")
    args = parser.parse_args()
    sync(args.source.resolve(), args.destination.resolve())
    print(f"synced macro pages to {args.destination.resolve()}")


if __name__ == "__main__":
    main()
