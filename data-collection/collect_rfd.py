#!/usr/bin/env python3
"""
Collect RFD hot deals into daily-scoop/data/rfd-deals.json.

This script is meant to be run by a cron job. It only uses the Python standard
library, so no pip install is required.

It will:
  1. Request RedFlagDeals Hot Deals with the approved category filter.
  2. Solve the RFD proof-of-work challenge if needed.
  3. Parse the topic cards.
  4. Apply filters:
     - exclude title keywords: home depot, tv/television/oled, ymmv, beer
     - exclude dealer keyword: beer
     - gift card / giftcard => heat +50
  5. Sort by heat, keep top 12, write daily-scoop/data/rfd-deals.json.
"""

import gzip
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser

# Approved RFD categories only (11 categories).
ALLOWED_CATEGORY_IDS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 53]
BASE_URL = "https://forums.redflagdeals.com/hot-deals-f9/"

EXCLUDED_TITLE_PATTERNS = [
    re.compile(r"home\s+depot", re.I),
    re.compile(r"\b(?:tv|televisions?|oled)\b", re.I),
    re.compile(r"\bymmv\b", re.I),
    re.compile(r"\bbeer\b", re.I),
]
EXCLUDED_DEALER_PATTERNS = [
    re.compile(r"\bbeer\b", re.I),
]


def is_excluded(title, dealer):
    title = title or ""
    dealer = dealer or ""
    return any(p.search(title) for p in EXCLUDED_TITLE_PATTERNS) or any(
        p.search(dealer) for p in EXCLUDED_DEALER_PATTERNS
    )



def clean_title(value):
    s = re.sub(r"[|]+", " - ", value or "")
    s = re.sub(r"\s+", " ", s).strip(" -")
    return s


def extract_discount(title):
    patterns = [
        re.compile(r"(?:save\s+)?\d{1,3}\s*%\s*(?:off|sitewide)?", re.I),
        re.compile(r"\b(bogo(?:\s+for\s+\$\d+(?:\.\d+)?)?|free)\b", re.I),
        re.compile(r"\$\s?\d+(?:[.,]\d+)?(?:\s*(?:off|was\.?|was\s*\$?\s?\d+(?:[.,]\d+)?))?", re.I),
        re.compile(r"\d+\s*(?:scene\s*points|miles|points|air\s*miles)", re.I),
    ]
    for pattern in patterns:
        m = pattern.search(title)
        if m:
            return m.group(0).strip()
    return ""


def normalize_deal(title, dealer):
    raw = clean_title(title)
    brand = (dealer or "").strip()
    discount = extract_discount(raw)

    item = raw
    if discount:
        item = item.replace(discount, " ", 1)

    if brand:
        if item.lower().startswith(brand.lower()):
            item = item[len(brand):]
        item = re.sub(
            r"\s*[:|\-\u2013\u2014]+\s*" + re.escape(brand) + r"\b",
            "",
            item,
            flags=re.I,
        )

    # Turn parenthetical notes into plain text and clean separators.
    item = re.sub(r"\s*\(([^)]*)\)", r" \1", item)
    item = re.sub(r"^\s*[,;:]+", "", item)
    item = re.sub(r"\s+-\s+", " - ", item)
    item = re.sub(r"\s*[\u2013\u2014|]\s*", " - ", item)
    item = re.sub(r"\s*:\s*", " - ", item)
    item = re.sub(r"\s+", " ", item).strip(" -")
    return brand, discount, item


def fetch(url, cookie=None):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept-Encoding": "gzip",
    }
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip":
            data = gzip.decompress(data)
        return data.decode("utf-8", "replace")


def solve_challenge(html):
    """Solve RFD's proof-of-work challenge and return the cookie string."""
    nonce = re.search(r"challenge_nonce:'([^']+)'", html)
    hmac = re.search(r"challenge_hmac:'([^']+)'", html)
    diff = re.search(r"difficulty:'(\d+)'", html)
    diff_char = re.search(r"difficulty_char:'([^']+)'", html)
    issued = re.search(r"issued_at:'([^']+)'", html)
    duration = re.search(r"cookie_duration:'([^']+)'", html)
    if not all([nonce, hmac, diff, diff_char, issued, duration]):
        raise RuntimeError("Could not find RFD challenge data")

    nonce = nonce.group(1)
    hmac = hmac.group(1)
    difficulty = int(diff.group(1))
    char = diff_char.group(1)
    issued = issued.group(1)
    duration = duration.group(1)
    prefix = char * difficulty

    for i in range(1, 2000000):
        digest = hashlib.sha256(f"{nonce}{issued}{i}".encode()).hexdigest()
        if digest.startswith(prefix):
            return (
                f"pow_bypass={nonce}|{issued}|{i}|{digest}|{hmac}; "
                f"domain=.redflagdeals.com; path=/; max-age={duration}; "
                "SameSite=Lax; Secure"
            )
    raise RuntimeError("Could not solve RFD challenge")


class RFDCardParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.card = None
        self.li_depth = 0
        self.field = None
        self.buf = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()

        if tag == "li" and "topic-card" in classes and self.card is None:
            self.card = {
                "href": "",
                "title": "",
                "dealer": "",
                "date": "",
                "votes": 0,
                "posts": 0,
            }
            self.li_depth = 1
            return

        if self.card is None:
            return

        if tag == "li":
            self.li_depth += 1
            return

        if tag == "a" and "thread_info" in classes:
            self.card["href"] = attrs.get("href", "")
        elif tag == "h3" and "thread_title" in classes:
            self.field = "title"
            self.buf = []
        elif tag == "div" and "dealer_name" in classes:
            self.field = "dealer"
            self.buf = []
        elif tag == "time" and "topic_time" in classes:
            self.field = "date"
            self.card["date"] = attrs.get("datetime", "")
            self.buf = []
        elif tag == "span" and "votes" in classes:
            self.field = "votes"
            self.buf = []
        elif tag == "span" and "posts" in classes:
            self.field = "posts"
            self.buf = []

    def handle_data(self, data):
        if self.card is not None and self.field in ("title", "dealer", "votes", "posts"):
            self.buf.append(data)

    def handle_endtag(self, tag):
        if self.card is None:
            return

        if tag == "li":
            self.li_depth -= 1
            if self.li_depth == 0:
                self._finish_card()
            return

        if tag in ("h3", "div", "time", "span") and self.field:
            if self.field in ("title", "dealer", "votes", "posts"):
                text = " ".join("".join(self.buf).split())
                if self.field in ("votes", "posts"):
                    match = re.search(r"-?\d+", text)
                    self.card[self.field] = int(match.group()) if match else 0
                else:
                    self.card[self.field] = text
            self.field = None
            self.buf = []

    def _finish_card(self):
        if self.card and self.card.get("title") and self.card.get("href"):
            self.cards.append(self.card)
        self.card = None
        self.field = None
        self.buf = []
        self.li_depth = 0


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(repo_root, "daily-scoop", "data", "rfd-deals.json")

    query = urllib.parse.urlencode({
        "c": ",".join(str(i) for i in ALLOWED_CATEGORY_IDS),
        "st": "7",
    })
    url = f"{BASE_URL}?{query}"

    print(f"Fetching {url}")
    html = fetch(url)

    if "challenge_nonce" in html:
        print("Solving RFD challenge...")
        cookie = solve_challenge(html)
        html = fetch(url, cookie)

    parser = RFDCardParser()
    parser.feed(html)

    deals = []
    for card in parser.cards:
        title = card.get("title", "")
        dealer = card.get("dealer", "")
        if is_excluded(title, dealer):
            continue

        gift_card = bool(re.search(r"gift\s*card", title, re.I))
        votes = int(card.get("votes") or 0)
        posts = int(card.get("posts") or 0)
        heat = votes + (50 if gift_card else 0)
        if heat <= 0:
            continue

        href = urllib.parse.urljoin("https://forums.redflagdeals.com", card.get("href", ""))
        brand, discount, item = normalize_deal(title, dealer)
        deals.append({
            "title": title,
            "href": href,
            "dealer": dealer,
            "brand": brand,
            "discount": discount,
            "item": item,
            "date": card.get("date", ""),
            "votes": votes,
            "posts": posts,
            "giftCard": gift_card,
            "heat": heat,
        })

    from datetime import datetime

    def sort_key(deal):
        try:
            ts = datetime.fromisoformat(deal["date"]).timestamp()
        except Exception:
            ts = 0
        return (-deal["heat"], -ts)

    deals.sort(key=sort_key)
    deals = deals[:12]

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(deals, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"Wrote {len(deals)} deals to {out_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)