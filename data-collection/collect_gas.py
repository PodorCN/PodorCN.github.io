#!/usr/bin/env python3
"""Collect CityNews Toronto gas prices for the Daily Scoop page."""

import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser


MAX_DAYS = 30
CITYNEWS_PAGE_URL = "https://toronto.citynews.ca/toronto-gta-gas-prices/"
CITYNEWS_API_URL = "https://toronto.citynews.ca/wp-json/news/v1/gas-prices"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PATH = os.path.join(REPO_ROOT, "daily-scoop", "data", "gas-prices.json")
DEFAULT_FORECAST_PATH = os.path.join(
    REPO_ROOT, "daily-scoop", "data", "gas-forecast.json"
)
MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}
DATE_RE = re.compile(r"^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$")
PRICE_RE = re.compile(r"(-?\d+(?:\.\d+)?)")


class HistoricalValuesParser(HTMLParser):
    """Extract rows from tables captioned 'Historical Values'."""

    def __init__(self):
        super().__init__()
        self.rows = []
        self._in_table = False
        self._table_depth = 0
        self._caption = ""
        self._table_rows = []
        self._row = None
        self._capture = None
        self._buffer = []

    def handle_starttag(self, tag, attrs):
        del attrs
        if tag == "table":
            if not self._in_table:
                self._in_table = True
                self._table_depth = 1
                self._caption = ""
                self._table_rows = []
            else:
                self._table_depth += 1
            return

        if not self._in_table:
            return
        if tag == "caption":
            self._capture = "caption"
            self._buffer = []
        elif tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._capture = "cell"
            self._buffer = []

    def handle_data(self, data):
        if self._capture:
            self._buffer.append(data)

    def handle_endtag(self, tag):
        if not self._in_table:
            return

        if tag == "caption" and self._capture == "caption":
            self._caption = " ".join("".join(self._buffer).split())
            self._capture = None
            self._buffer = []
        elif tag in ("td", "th") and self._capture == "cell":
            self._row.append(" ".join("".join(self._buffer).split()))
            self._capture = None
            self._buffer = []
        elif tag == "tr" and self._row is not None:
            if self._row:
                self._table_rows.append(self._row)
            self._row = None
        elif tag == "table":
            self._table_depth -= 1
            if self._table_depth == 0:
                if self._caption.casefold() == "historical values":
                    self.rows.extend(self._table_rows)
                self._in_table = False


def load_data(path):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError("gas-prices.json must be a JSON array")
    return data


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def trim_to_rolling_month(data, today=None):
    cutoff = (today or date.today()) - timedelta(days=MAX_DAYS)
    cleaned = {}
    for item in data:
        try:
            item_date = date.fromisoformat(item["date"])
            price = float(item["price"])
        except (KeyError, TypeError, ValueError):
            continue
        if item_date >= cutoff and price > 0:
            # Later entries replace earlier ones, allowing a fresh scrape to correct data.
            cleaned[item_date] = {"date": item_date.isoformat(), "price": price}
    return [cleaned[item_date] for item_date in sorted(cleaned)][-MAX_DAYS:]


def parse_citynews_date(value):
    match = DATE_RE.fullmatch(value.strip())
    if not match:
        raise ValueError(f"Unexpected CityNews date: {value!r}")
    month_name, day, year = match.groups()
    month = MONTHS.get(month_name.casefold())
    if not month:
        raise ValueError(f"Unexpected CityNews month: {month_name!r}")
    return date(int(year), month, int(day))


def parse_historical_prices(html):
    parser = HistoricalValuesParser()
    parser.feed(html)
    prices = []
    for row in parser.rows:
        if len(row) < 3:
            continue
        try:
            item_date = parse_citynews_date(row[0])
        except ValueError:
            continue
        price_match = PRICE_RE.search(row[2])
        if not price_match:
            continue
        price = float(price_match.group(1))
        if price > 0:
            prices.append({"date": item_date.isoformat(), "price": price})
    if not prices:
        raise ValueError("CityNews historical gas price table was empty")
    return prices


def parse_forecast(payload):
    rows = payload.get("gas_prices") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise ValueError("CityNews response has no gas_prices array")
    matches = [
        row
        for row in rows
        if isinstance(row, dict)
        and row.get("page_url", "").rstrip("/") == CITYNEWS_PAGE_URL.rstrip("/")
    ]
    if len(matches) != 1:
        raise ValueError(f"Expected one Toronto forecast, got {len(matches)}")

    row = matches[0]
    forecast_date = parse_citynews_date(row.get("latest_date", ""))
    try:
        price = float(row["latest_new_total"])
        magnitude = abs(float(row["latest_change_value"]))
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid CityNews forecast price fields") from exc

    direction = row.get("latest_change")
    if direction == "priceup":
        change = magnitude
    elif direction == "pricedown":
        change = -magnitude
    elif magnitude == 0:
        change = 0.0
    else:
        raise ValueError(f"Unknown CityNews price direction: {direction!r}")
    if price <= 0:
        raise ValueError("CityNews forecast price must be positive")

    return {
        "date": forecast_date.isoformat(),
        "price": price,
        "change": change,
        "source": "CityNews / En-Pro published forecast",
        "sourceUrl": CITYNEWS_PAGE_URL,
    }


def fetch(url, accept):
    request = urllib.request.Request(
        url,
        headers={
            "Accept": accept,
            "User-Agent": "PodorM-Daily-Scoop/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def collect_citynews():
    history = parse_historical_prices(fetch(CITYNEWS_PAGE_URL, "text/html"))
    forecast = parse_forecast(json.loads(fetch(CITYNEWS_API_URL, "application/json")))
    latest = max(history, key=lambda item: item["date"])
    latest_date = date.fromisoformat(latest["date"])
    forecast_date = date.fromisoformat(forecast["date"])

    if forecast_date != latest_date + timedelta(days=1):
        raise RuntimeError(
            f"CityNews forecast {forecast['date']} does not follow history {latest['date']}"
        )
    expected_current = forecast["price"] - forecast["change"]
    if abs(expected_current - latest["price"]) > 0.11:
        raise RuntimeError(
            "CityNews forecast does not match the latest historical price: "
            f"expected {expected_current:.1f}, got {latest['price']:.1f}"
        )

    forecast["updatedAt"] = datetime.now(timezone.utc).isoformat(
        timespec="seconds"
    ).replace("+00:00", "Z")
    return history, forecast


def main():
    parser = argparse.ArgumentParser(description="Maintain Toronto gas price JSON")
    parser.add_argument("--path", default=DEFAULT_PATH, help="Path to gas-prices.json")
    parser.add_argument(
        "--forecast-path", default=DEFAULT_FORECAST_PATH, help="Path to gas-forecast.json"
    )
    parser.add_argument(
        "--fetch", action="store_true", help="Fetch history and forecast from CityNews"
    )
    parser.add_argument("--date", help="Date as YYYY-MM-DD")
    parser.add_argument("--price", type=float, help="Gas price in CAD cents per litre")
    parser.add_argument("--overwrite", action="store_true", help="Replace same-date value")
    args = parser.parse_args()

    if args.fetch and (args.date or args.price is not None):
        parser.error("--fetch cannot be combined with --date or --price")
    if bool(args.date) != (args.price is not None):
        parser.error("--date and --price must be provided together")

    data = load_data(args.path)
    if args.fetch:
        history, forecast = collect_citynews()
        data.extend(history)
        save_json(args.forecast_path, forecast)
        print(
            f"Forecast: {forecast['date']} -> {forecast['price']} "
            f"({forecast['change']:+.1f})"
        )
    elif args.date and args.price is not None:
        item_date = date.fromisoformat(args.date)
        exists = any(item.get("date") == item_date.isoformat() for item in data)
        if exists and not args.overwrite:
            print(f"{item_date.isoformat()} already exists; use --overwrite to replace it")
        else:
            data = [item for item in data if item.get("date") != item_date.isoformat()]
            data.append({"date": item_date.isoformat(), "price": args.price})
            print(f"Added {item_date.isoformat()} -> {args.price}")

    data = trim_to_rolling_month(data)
    save_json(args.path, data)
    print(f"Wrote {len(data)} gas price points to {args.path}")
    if data:
        print(f"Latest: {data[-1]['date']} -> {data[-1]['price']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
