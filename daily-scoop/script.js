// Daily Scoop — static GitHub Pages site.
// Data files are updated separately by a cron job; the HTML/JS only reads them.
// Sources:
//   - Gas:  data/gas-prices.json
//   - Deals: data/rfd-deals.json

const GAS_DATA_URL = "data/gas-prices.json";
const RFD_DATA_URL = "data/rfd-deals.json";
const FALLBACK_GAS_PRICES = [
  {"date": "2026-07-25", "price": 175.7},
  {"date": "2026-07-26", "price": 173.9},
  {"date": "2026-07-27", "price": 173.6},
  {"date": "2026-07-28", "price": 172.8},
  {"date": "2026-07-29", "price": 170.7},
  {"date": "2026-07-30", "price": 170.8},
  {"date": "2026-07-31", "price": 172.6},
  {"date": "2026-08-01", "price": 167.5},
  {"date": "2026-08-02", "price": 166.0},
  {"date": "2026-08-03", "price": 165.2},
  {"date": "2026-08-04", "price": 164.6},
  {"date": "2026-08-05", "price": 161.5},
  {"date": "2026-08-06", "price": 153.8},
  {"date": "2026-08-07", "price": 152.8},
  {"date": "2026-08-08", "price": 155.2},
  {"date": "2026-08-09", "price": 155.6},
  {"date": "2026-08-10", "price": 156.2},
  {"date": "2026-08-11", "price": 156.3},
  {"date": "2026-08-12", "price": 161.0},
  {"date": "2026-08-13", "price": 160.6},
  {"date": "2026-08-14", "price": 161.0},
  {"date": "2026-08-15", "price": 160.9},
  {"date": "2026-08-16", "price": 162.5},
  {"date": "2026-08-17", "price": 162.7},
  {"date": "2026-08-18", "price": 162.8},
  {"date": "2026-08-19", "price": 165.3},
  {"date": "2026-08-20", "price": 167.1},
  {"date": "2026-08-21", "price": 166.5},
  {"date": "2026-08-22", "price": 167.7}
];

const FALLBACK_RFD_DEALS = [{"title": "Google Pixel 10 128G - Lemongrass $400 off", "href": "https://forums.redflagdeals.com/best-buy-google-pixel-10-128g-lemongrass-400-off-2823673/", "dealer": "Best Buy", "date": "2026-08-21T07:15:16+00:00", "votes": 73, "posts": 97, "giftCard": false, "heat": 73}, {"title": "Costco West |Aug 17-23 |357 pics| Week #33", "href": "https://forums.redflagdeals.com/costco-costco-west-aug-17-23-357-pics-week-33-2823818/", "dealer": "Costco", "date": "2026-08-22T19:31:37+00:00", "votes": 51, "posts": 14, "giftCard": false, "heat": 51}, {"title": "Aluminum Sealing Tape (2 in. x 33 ft) $2.99", "href": "https://forums.redflagdeals.com/princess-auto-aluminum-sealing-tape-2-x-33-ft-2-99-2823768/", "dealer": "Princess Auto", "date": "2026-08-22T03:01:56+00:00", "votes": 37, "posts": 4, "giftCard": false, "heat": 37}, {"title": "Fill up with a minimum of 25L to earn 500 Scene points", "href": "https://forums.redflagdeals.com/shell-fill-up-minimum-25l-earn-500-scene-points-2823856/", "dealer": "Shell", "date": "2026-08-23T13:22:03+00:00", "votes": 22, "posts": 2, "giftCard": false, "heat": 22}, {"title": "SUNLU PLA+ Filament, 1.75mm, Grey, 4KG (4 Spools) -- $50.39", "href": "https://forums.redflagdeals.com/amazon-ca-sunlu-pla-filament-1-75mm-grey-4kg-4-spools-50-39-2823713/", "dealer": "Amazon.ca", "date": "2026-08-21T17:26:37+00:00", "votes": 12, "posts": 14, "giftCard": false, "heat": 12}, {"title": "SAVE 30% SITEWIDE - When You Reserve Any Product Online - 30th ANNIVERSARY SALE", "href": "https://forums.redflagdeals.com/save-30-sitewide-when-you-reserve-any-product-online-30th-anniversary-sale-2823706/", "dealer": "PartSource", "date": "2026-08-21T16:06:27+00:00", "votes": 10, "posts": 38, "giftCard": false, "heat": 10}, {"title": "Swiss Chalet - 2 can Dine for $19.99 (Dine-in or Takeout)", "href": "https://forums.redflagdeals.com/swiss-chalet-swiss-chalet-2-can-dine-19-99-dine-takeout-2823831/", "dealer": "Swiss Chalet", "date": "2026-08-22T22:45:14+00:00", "votes": 9, "posts": 6, "giftCard": false, "heat": 9}, {"title": "BOGO for $1, 8/24-30, online only participating locations", "href": "https://forums.redflagdeals.com/dominos-pizza-bogo-1-8-24-30-online-only-participating-locations-2823779/", "dealer": "Domino's Pizza", "date": "2026-08-22T05:01:52+00:00", "votes": 9, "posts": 1, "giftCard": false, "heat": 9}, {"title": "$120 ASUS TUF Gaming BE3600 Dual Band WiFi 7 Gaming Router", "href": "https://forums.redflagdeals.com/staples-120-asus-tuf-gaming-be3600-dual-band-wifi-7-gaming-router-2823821/", "dealer": "Staples", "date": "2026-08-22T19:52:41+00:00", "votes": 8, "posts": 12, "giftCard": false, "heat": 8}, {"title": "Vancouver: EQ Bank Pop Up at Superstore on Grandview and Rupert", "href": "https://forums.redflagdeals.com/eq-bank-vancouver-eq-bank-pop-up-superstore-grandview-rupert-2823729/", "dealer": "EQ Bank", "date": "2026-08-21T19:22:23+00:00", "votes": 8, "posts": 12, "giftCard": false, "heat": 8}, {"title": "DJI Lito 1 Two-Battery Combo – $399.99 (was. $ 475)", "href": "https://forums.redflagdeals.com/amazon-ca-dji-lito-1-two-battery-combo-ci-399-99-475-2823678/", "dealer": "Amazon.ca", "date": "2026-08-21T11:23:30+00:00", "votes": 8, "posts": 8, "giftCard": false, "heat": 8}, {"title": "Detour Coffee 25% Off plus Free Shipping (Code: ENDLESS)", "href": "https://forums.redflagdeals.com/detour-coffee-detour-coffee-25-off-plus-free-shipping-code-endless-2823666/", "dealer": "Detour Coffee", "date": "2026-08-21T04:06:36+00:00", "votes": 7, "posts": 4, "giftCard": false, "heat": 7}];

const EXCLUDED_TITLE_PATTERNS = [
  /home\s+depot/i,
  /\b(?:tv|televisions?|oled)\b/i,
  /\bymmv\b/i,
  /\bbeer\b/i,
];
const EXCLUDED_DEALER_PATTERNS = [
  /\bbeer\b/i,
];

function isExcludedDeal(title, dealer) {
  const titleText = title || "";
  const dealerText = dealer || "";
  return EXCLUDED_TITLE_PATTERNS.some((re) => re.test(titleText)) ||
         EXCLUDED_DEALER_PATTERNS.some((re) => re.test(dealerText));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function predictNextPrice(points) {
  if (!points || points.length < 3) return null;
  const lookback = Math.min(7, points.length - 1);
  let sumChange = 0;
  for (let i = points.length - lookback; i < points.length; i++) {
    sumChange += points[i].price - points[i - 1].price;
  }
  const avgChange = sumChange / lookback;
  return points[points.length - 1].price + avgChange;
}

function setGasPrediction(points, note) {
  const node = document.getElementById("gas-prediction");
  if (!node) return;
  const pred = predictNextPrice(points);
  node.textContent = `Tomorrow's predicted Toronto gas price: ~${pred ? pred.toFixed(1) : "—"} CAD c/L${note ? ` (${note})` : ""}`;
}

async function loadOilPrices() {
  const container = document.getElementById("gas-chart");
  const caption = document.getElementById("gas-caption");

  const fallback = FALLBACK_GAS_PRICES
    .filter((p) => p && p.date && p.price !== null && p.price !== undefined)
    .map((p) => ({ date: new Date(p.date), price: p.price }));

  // Show fallback immediately so the chart is never blank.
  if (fallback.length >= 2) {
    renderOilChart(fallback);
    setGasPrediction(fallback, "fallback");
    const fallbackLast = fallback[fallback.length - 1];
    const fallbackPred = predictNextPrice(fallback);
    caption.textContent = `Toronto gas · last ${fallbackLast.price.toFixed(1)} · tomorrow ~${fallbackPred ? fallbackPred.toFixed(1) : "—"} (fallback shown, loading…)`;
  }

  try {
    const res = await fetch(GAS_DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Gas data ${res.status}`);
    const data = await res.json();
    const points = data
      .filter((p) => p && p.date && p.price !== null && p.price !== undefined)
      .map((p) => ({ date: new Date(p.date), price: p.price }));

    if (points.length < 2) throw new Error("Not enough gas price points");

    renderOilChart(points);
    setGasPrediction(points, "trend-based prediction");
    const last = points[points.length - 1];
    const pred = predictNextPrice(points);
    caption.textContent = `Toronto gas · last ${last.price.toFixed(1)} · tomorrow ~${pred ? pred.toFixed(1) : "—"} (predicted)`;
  } catch (err) {
    if (fallback.length >= 2) {
      setGasPrediction(fallback, "built-in fallback");
      const last = fallback[fallback.length - 1];
      const pred = predictNextPrice(fallback);
      caption.textContent = `Toronto gas · last ${last.price.toFixed(1)} · tomorrow ~${pred ? pred.toFixed(1) : "—"} (built-in fallback)`;
    } else {
      container.textContent = "";
      container.appendChild(el("p", "loading", `Could not load gas chart: ${err.message}`));
      caption.textContent = "Gas chart unavailable";
    }
  }
}

function renderOilChart(points) {
  const container = document.getElementById("gas-chart");
  container.textContent = "";

  const width = 820;
  const height = 300;
  const padX = 46;
  const padTop = 24;
  const padBottom = 44;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const lower = min - span * 0.12;
  const upper = max + span * 0.12;
  const range = upper - lower || 1;

  const x = (i) => padX + (i / (points.length - 1)) * (width - padX * 2);
  const y = (price) => padTop + ((upper - price) / range) * (height - padTop - padBottom);

  const linePoints = points.map((p, i) => `${x(i).toFixed(1)},${y(p.price).toFixed(1)}`);
  const linePath = `M${linePoints.join(" L")}`;
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${(height - padBottom).toFixed(1)} L${x(0).toFixed(1)},${(height - padBottom).toFixed(1)} Z`;

  const monthLabels = [];
  const labelStep = Math.ceil(points.length / 6);
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === points.length - 1) {
      monthLabels.push(`<text x="${x(i).toFixed(1)}" y="${height - 18}" text-anchor="middle" class="chart-label">${escapeHTML(formatDate(p.date.toISOString()))}</text>`);
    }
  });

  const last = points[points.length - 1];
  const first = points[0];
  const svg = `
    <svg viewBox="0 0 ${width} ${height}" class="oil-chart" role="img" aria-label="Toronto gas price trend for the last month">
      <defs>
        <linearGradient id="oilArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9184d9" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#9184d9" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <line x1="${padX}" y1="${y(max).toFixed(1)}" x2="${width - padX}" y2="${y(max).toFixed(1)}" class="chart-gridline"/>
      <line x1="${padX}" y1="${y((min + max) / 2).toFixed(1)}" x2="${width - padX}" y2="${y((min + max) / 2).toFixed(1)}" class="chart-gridline"/>
      <line x1="${padX}" y1="${y(min).toFixed(1)}" x2="${width - padX}" y2="${y(min).toFixed(1)}" class="chart-gridline"/>
      <path d="${areaPath}" fill="url(#oilArea)"/>
      <path d="${linePath}" class="chart-line"/>
      ${monthLabels.join("")}
      <text x="${padX - 10}" y="${y(max).toFixed(1) + 4}" text-anchor="end" class="chart-label">${max.toFixed(1)}</text>
      <text x="${padX - 10}" y="${y(min).toFixed(1) + 4}" text-anchor="end" class="chart-label">${min.toFixed(1)}</text>
      <circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.price).toFixed(1)}" r="4" class="chart-dot"/>
      <text x="${x(points.length - 1) - 10}" y="${y(last.price) - 12}" text-anchor="end" class="chart-last">${last.price.toFixed(2)} ${formatDate(last.date.toISOString())}</text>
    </svg>
  `;

  const chartWrap = el("div", "chart-wrap");
  chartWrap.innerHTML = svg;

  const predicted = predictNextPrice(points);
  const summary = el("p", "chart-summary",
    `${points.length} days · ${first.price.toFixed(1)} → ${last.price.toFixed(1)} CAD c/L · low ${min.toFixed(1)} / high ${max.toFixed(1)} · tomorrow ~${predicted ? predicted.toFixed(1) : "—"}`);
  container.append(chartWrap, summary);
}

async function loadDeals() {
  const container = document.getElementById("deals-list");
  const caption = document.getElementById("deals-caption");

  const renderList = (deals, text) => {
    container.textContent = "";
    if (!deals || deals.length === 0) {
      container.appendChild(el("p", "loading", "No deals match the current RFD filters"));
      caption.textContent = text;
      return;
    }
    deals.slice(0, 12).forEach((deal) => container.appendChild(renderDealCard(deal)));
    caption.textContent = text;
  };

  // Show fallback immediately so the RFD section is never empty.
  renderList(FALLBACK_RFD_DEALS, "Loading deals…");

  try {
    const res = await fetch(RFD_DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`RFD data ${res.status}`);
    const raw = await res.json();
    const deals = (Array.isArray(raw) ? raw : [])
      .filter((d) => d && d.title && d.href)
      .filter((d) => !isExcludedDeal(d.title, d.dealer))
      .map((d) => {
        const giftCard = /gift\s*card/i.test(d.title) || !!d.giftCard;
        const votes = Number(d.votes) || 0;
        return {
          ...d,
          giftCard,
          heat: Number(d.heat) || votes + (giftCard ? 50 : 0),
        };
      })
      .filter((d) => d.heat > 0)
      .sort((a, b) => b.heat - a.heat || new Date(b.date) - new Date(a.date));

    if (deals.length === 0) throw new Error("No deals match the current RFD filters");

    renderList(deals, `Top ${Math.min(deals.length, 12)} deals from data file · by heat`);
  } catch (err) {
    renderList(FALLBACK_RFD_DEALS, `Top ${Math.min(FALLBACK_RFD_DEALS.length, 12)} deals · fallback snapshot`);
  }
}

function renderDealCard(deal) {
  const card = el("article", "deal-card");

  const title = el("h3", "deal-title");
  const link = el("a", "", deal.title);
  link.href = deal.href;
  link.target = "_blank";
  link.rel = "noopener";
  title.appendChild(link);
  card.appendChild(title);

  const meta = el("div", "deal-meta");
  const dealer = el("span", "chip", deal.dealer || "RFD");
  const votes = el("span", "chip chip-votes", `🔥 ${deal.heat}`);
  if (deal.giftCard) meta.appendChild(el("span", "chip chip-gift", "gift card"));
  const posts = el("span", "chip", `${deal.posts} replies`);
  const time = el("span", "deal-time", relativeTime(deal.date));
  meta.append(dealer, votes, posts, time);
  card.appendChild(meta);

  const open = el("a", "deal-link", "Open deal");
  open.href = deal.href;
  open.target = "_blank";
  open.rel = "noopener";
  card.appendChild(open);

  return card;
}

function initPage() {
  const today = new Date();
  document.getElementById("page-dates").textContent = today.toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  document.getElementById("page-meta").textContent = "Toronto gas price from git + RFD top heat deals from last 7 days";
  document.getElementById("footer-updated").textContent = `updated ${today.toISOString().slice(0, 10)}`;

  loadOilPrices();
  loadDeals();
}

initPage();