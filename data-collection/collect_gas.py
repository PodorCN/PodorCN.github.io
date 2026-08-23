#!/usr/bin/env python3
"""
Maintain daily-scoop/data/gas-prices.json.

This script is intended for a cron job. It uses only the Python standard library.

Examples:
  # Show current gas data and trim to the latest 30 days
  python3 data-collection/collect_gas.py

  # Add today's Toronto gas price
  python3 data-collection/collect_gas.py --date 2026-08-23 --price 166.5

  # Add today's price and overwrite if the same date already exists
  python3 data-collection/collect_gas.py --date 2026-08-23 --price 166.5 --overwrite
"""

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta

MAX_DAYS = 30
DEFAULT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "daily-scoop",
    "data",
    "gas-prices.json",
)


def load_data(path):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError("gas-prices.json must be a JSON array")
    return data


def save_data(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def trim_to_rolling_month(data):
    cutoff = date.today() - timedelta(days=MAX_DAYS)
    cleaned = []
    seen = set()
    for item in data:
        try:
            d = datetime.fromisoformat(item["date"]).date()
        except Exception:
            continue
        if d < cutoff:
            continue
        if d in seen:
            continue
        seen.add(d)
        cleaned.append({"date": d.isoformat(), "price": float(item["price"])})
    cleaned.sort(key=lambda x: x["date"])
    return cleaned[-MAX_DAYS:]


def main():
    parser = argparse.ArgumentParser(description="Maintain Toronto gas price JSON")
    parser.add_argument("--path", default=DEFAULT_PATH, help="Path to gas-prices.json")
    parser.add_argument("--date", help="Date as YYYY-MM-DD")
    parser.add_argument("--price", type=float, help="Gas price in CAD cents per litre")
    parser.add_argument("--overwrite", action="store_true", help="Replace existing same-date value")
    args = parser.parse_args()

    data = load_data(args.path)

    if args.date and args.price is not None:
        d = datetime.fromisoformat(args.date).date()
        exists = any(item.get("date") == d.isoformat() for item in data)
        if exists and not args.overwrite:
            print(f"{d.isoformat()} already exists; use --overwrite to replace it")
        else:
            data = [item for item in data if item.get("date") != d.isoformat()]
            data.append({"date": d.isoformat(), "price": args.price})
            print(f"Added {d.isoformat()} -> {args.price}")

    data = trim_to_rolling_month(data)
    save_data(args.path, data)

    print(f"Wrote {len(data)} gas price points to {args.path}")
    if data:
        print(f"Latest: {data[-1]['date']} -> {data[-1]['price']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)