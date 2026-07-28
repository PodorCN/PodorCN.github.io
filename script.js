// ── ASCII wordmark engine (ported from the design handoff's PodorM Site.dc.html) ──

const FONT = {
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  R: ["####.", "#...#", "#...#", "####.", "#..#.", "#...#", "#...#"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
};

function mask(word) {
  const rows = [];
  for (let r = 0; r < 7; r++) {
    let line = "";
    for (let i = 0; i < word.length; i++) {
      const g = FONT[word[i]] || ["#####", "#####", "#####", "#####", "#####", "#####", "#####"];
      line += (i ? "." : "") + g[r];
    }
    rows.push(line);
  }
  return rows;
}

function on(m, x, y) {
  return y >= 0 && y < m.length && x >= 0 && x < m[0].length && m[y][x] === "#";
}

function hash(x, y, s) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function outlineRows(m, pad) {
  const p = pad || 0;
  const rows = [];
  for (let y = -1; y < m.length + 1; y++) {
    let line = "";
    for (let x = -p; x < m[0].length + p; x++) {
      if (!on(m, x, y)) { line += " "; continue; }
      const h = on(m, x - 1, y) || on(m, x + 1, y);
      const v = on(m, x, y - 1) || on(m, x, y + 1);
      line += h && v ? "┼" : h ? "═" : v ? "║" : "▪";
    }
    rows.push(line);
  }
  return rows;
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const heroRows = outlineRows(mask("PODORM"), 1);
const markRows = outlineRows(mask("PODORM"), 0);

const heroEl = document.getElementById("hero-ascii");
const subEl = document.getElementById("hero-subtitle");
const footerMarkEl = document.getElementById("footer-ascii");

const SUBTITLE = "POWERED BY MZX";

function paint(t) {
  const noise = "▒░#%*+=-";
  heroEl.textContent = heroRows.map((row, y) => row.split("").map((c, x) => {
    if (c === " ") return " ";
    const p = (t * 0.55 - x * 0.012) % 1;
    return p < 0.42 ? noise[Math.floor(hash(x, y, Math.floor(t * 14)) * noise.length)] : c;
  }).join("")).join("\n");

  const n = Math.floor(((t * 0.55) % 1) * (SUBTITLE.length + 10));
  subEl.textContent = SUBTITLE.slice(0, Math.min(SUBTITLE.length, n));
}

footerMarkEl.textContent = markRows.join("\n");

if (reduceMotion) {
  heroEl.textContent = heroRows.join("\n");
  subEl.textContent = SUBTITLE;
} else {
  const t0 = performance.now();
  function loop() {
    paint((performance.now() - t0) / 1000);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ── Market data (Twelve Data API) ──
//
// Get a free key at https://twelvedata.com/pricing (no credit card, ~10 seconds)
// and paste it below. Free tier: 800 requests/day, 8 requests/minute.
//
// NOTE: this key runs client-side and is visible to anyone who views source —
// that's unavoidable for a backend-less static site. Free-tier keys have no
// billing attached, so the worst case is the shared quota getting exhausted
// (indices just stop updating until it resets), not a billing risk.
const TWELVE_DATA_API_KEY = "80759d2a961f4a4395f2ef3acd8fe11d";

// Twelve Data's free plan doesn't include raw index-level data (SPX, IXIC,
// N225, 000300) or non-US exchanges (XIU on TSX) — confirmed via direct API
// testing, all four returned 404s even with a real free key. These are
// free-tier-accessible US-listed ETFs that track the same markets instead.
const INDICES = [
  { id: "i0", name: "S&P 500", ticker: "SPY", symbol: "SPY" },
  { id: "i1", name: "NASDAQ Composite", ticker: "ONEQ", symbol: "ONEQ" },
  { id: "i2", name: "CSI 300", ticker: "ASHR", symbol: "ASHR" },
  { id: "i3", name: "Japan (MSCI)", ticker: "EWJ", symbol: "EWJ" },
  { id: "i4", name: "Canada (MSCI)", ticker: "EWC", symbol: "EWC" },
];

// Shared once-per-day cache for anything fetched client-side (market
// returns, GitHub repos, course notes) — avoids refetching on every page
// load while keeping data at most a day stale.
function makeDailyCache(key) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        return cache.date === new Date().toISOString().slice(0, 10) ? cache.data : null;
      } catch {
        return null;
      }
    },
    save(data) {
      try {
        localStorage.setItem(key, JSON.stringify({ date: new Date().toISOString().slice(0, 10), data }));
      } catch {
        // localStorage unavailable (private browsing, etc.) — refetches next load
      }
    },
  };
}

const RETURN_DAYS = 30;
const RETURN_CACHE_KEY = "podorm_returns_cache_v2";

function twelveDataUrl(path, cfg, extra) {
  const params = new URLSearchParams({ symbol: cfg.symbol, apikey: TWELVE_DATA_API_KEY, ...extra });
  if (cfg.exchange) params.set("exchange", cfg.exchange);
  return `https://api.twelvedata.com/${path}?${params.toString()}`;
}

// This is daily (not live) data — one time_series call per index, cached for
// the day. No polling, no /quote calls, so 5 requests total per day per
// visitor is comfortably inside the free tier's 800/day, 8/min caps even
// without the request-per-request throttling the earlier live version needed.
let requestChain = Promise.resolve();
const FETCH_GAP_MS = 1500;

function throttled(taskFn) {
  const result = requestChain.then(taskFn, taskFn);
  requestChain = result.catch(() => {}).then(() => new Promise(r => setTimeout(r, FETCH_GAP_MS)));
  return result;
}

function fetchDailyReturns(cfg) {
  return throttled(async () => {
    const res = await fetch(twelveDataUrl("time_series", cfg, { interval: "1day", outputsize: String(RETURN_DAYS + 1) }));
    const data = await res.json();
    if (data.status === "error" || data.code) throw new Error(data.message || "time_series error");
    const values = data.values.slice().reverse(); // API returns newest-first; we want chronological
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      const prev = parseFloat(values[i - 1].close);
      const close = parseFloat(values[i].close);
      returns.push({ date: values[i].datetime, pct: ((close - prev) / prev) * 100 });
    }
    return returns;
  });
}

const returnsCache = makeDailyCache(RETURN_CACHE_KEY);

function renderReturn(cfg, returns) {
  const el = document.getElementById(cfg.id + "-return");
  const latest = returns[returns.length - 1];
  if (!latest || !Number.isFinite(latest.pct)) return;
  const up = latest.pct >= 0;
  el.textContent = (up ? "▲ +" : "▼ ") + Math.abs(latest.pct).toFixed(2) + "%";
  el.classList.toggle("up", up);
  el.classList.toggle("down", !up);
}

const tooltipEl = document.getElementById("chart-tooltip");
const tooltipValueEl = tooltipEl.appendChild(document.createElement("div"));
tooltipValueEl.className = "tt-value";
const tooltipDateEl = tooltipEl.appendChild(document.createElement("div"));
tooltipDateEl.className = "tt-date";
const svgNS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(svgNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function formatTooltipDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Latest trading date represented across all indices' return series —
// shown so it's clear this is daily (not live) data and how fresh it is.
function latestDataDate(dataByIndex) {
  let max = null;
  for (const id in dataByIndex) {
    const arr = dataByIndex[id];
    const d = arr && arr[arr.length - 1] && arr[arr.length - 1].date;
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

// 30-day daily-return line chart. Single series, so no legend (the card's
// own label already names it) — per dataviz mark specs: 2px accent line,
// round joins, a recessive zero baseline (returns are signed, so the
// baseline is the meaningful reference, not an axis minimum), an end-dot
// marking today, and a hover crosshair + tooltip reading the exact day.
function renderChart(cfg, returns) {
  const container = document.getElementById(cfg.id + "-chart");
  container.textContent = "";
  if (!returns || returns.length < 2) return;

  const VB_W = 300, VB_H = 56, PAD_Y = 8;
  const plotH = VB_H - PAD_Y * 2;
  const n = returns.length;
  const maxAbs = Math.max(...returns.map(r => Math.abs(r.pct)), 0.01) * 1.15;

  const x = i => (i / (n - 1)) * VB_W;
  const y = pct => PAD_Y + plotH / 2 - (pct / maxAbs) * (plotH / 2);
  const baselineY = y(0);

  const svg = svgEl("svg", { viewBox: `0 0 ${VB_W} ${VB_H}`, preserveAspectRatio: "none" });

  svg.appendChild(svgEl("line", { class: "baseline", x1: 0, y1: baselineY, x2: VB_W, y2: baselineY }));

  const d = returns.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(r.pct).toFixed(2)}`).join(" ");
  svg.appendChild(svgEl("path", { class: "line", d }));

  const last = returns[n - 1];
  svg.appendChild(svgEl("circle", { class: "end-dot", cx: x(n - 1), cy: y(last.pct), r: 4 }));

  const hoverLine = svgEl("line", { class: "hover-line", x1: 0, y1: PAD_Y, x2: 0, y2: VB_H - PAD_Y });
  const hoverDot = svgEl("circle", { class: "hover-dot", r: 4, cx: 0, cy: 0 });
  svg.appendChild(hoverLine);
  svg.appendChild(hoverDot);

  const hitArea = svgEl("rect", { class: "hit-area", x: 0, y: 0, width: VB_W, height: VB_H });
  svg.appendChild(hitArea);

  function showAt(i) {
    const r = returns[i];
    hoverLine.setAttribute("x1", x(i));
    hoverLine.setAttribute("x2", x(i));
    hoverDot.setAttribute("cx", x(i));
    hoverDot.setAttribute("cy", y(r.pct));
    hoverLine.style.opacity = 1;
    hoverDot.style.opacity = 1;

    tooltipValueEl.textContent = (r.pct >= 0 ? "+" : "") + r.pct.toFixed(2) + "%";
    tooltipDateEl.textContent = `${cfg.ticker} · ${formatTooltipDate(r.date)}`;
    tooltipEl.hidden = false;
  }

  function hide() {
    hoverLine.style.opacity = 0;
    hoverDot.style.opacity = 0;
    tooltipEl.hidden = true;
  }

  hitArea.addEventListener("pointermove", e => {
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * VB_W;
    const i = Math.max(0, Math.min(n - 1, Math.round((localX / VB_W) * (n - 1))));
    showAt(i);
    tooltipEl.style.left = e.clientX + "px";
    tooltipEl.style.top = rect.top + "px";
  });
  hitArea.addEventListener("pointerleave", hide);

  container.appendChild(svg);
}

function initMarket() {
  const captionEl = document.getElementById("market-caption");
  if (!TWELVE_DATA_API_KEY || TWELVE_DATA_API_KEY === "YOUR_API_KEY_HERE") {
    captionEl.textContent = "Add a Twelve Data API key in script.js to enable live data (see comment above TWELVE_DATA_API_KEY)";
    return;
  }

  function setCaption(dataByIndex) {
    const asOf = latestDataDate(dataByIndex);
    captionEl.textContent = "Daily return, last 30 sessions · ETF-tracked proxies via Twelve Data"
      + (asOf ? ` · data through ${formatLongDate(asOf)}` : "");
  }

  const cached = returnsCache.load();
  if (cached) {
    for (const cfg of INDICES) {
      if (!cached[cfg.id]) continue;
      renderReturn(cfg, cached[cfg.id]);
      renderChart(cfg, cached[cfg.id]);
    }
    setCaption(cached);
    return;
  }

  captionEl.textContent = "Loading market data…";
  const data = {};
  Promise.all(INDICES.map(cfg =>
    fetchDailyReturns(cfg).then(
      returns => { data[cfg.id] = returns; renderReturn(cfg, returns); renderChart(cfg, returns); },
      err => console.warn(`[market] fetch failed for ${cfg.name} (${cfg.symbol}):`, err.message)
    )
  )).then(() => {
    returnsCache.save(data);
    setCaption(data);
  });
}

// ── Github (real repos via the public GitHub REST API — no token needed) ──

const GITHUB_USER = "PodorCN";
const GITHUB_REPOS_CACHE_KEY = "podorm_github_repos_cache_v2";
// Curated picks, shown in this order — not an automatic "most active" selection.
const GITHUB_PINNED_REPOS = ["StockSentimentAnalyzer", "ETF_Allocator", "Mini_OCR"];
const githubReposCache = makeDailyCache(GITHUB_REPOS_CACHE_KEY);

async function fetchTopRepos() {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`);
  const repos = await res.json();
  if (!Array.isArray(repos)) throw new Error((repos && repos.message) || "GitHub API error");
  const byName = new Map(repos.map(r => [r.name, r]));
  return GITHUB_PINNED_REPOS
    .map(name => byName.get(name))
    .filter(Boolean)
    .map(r => ({
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
    }));
}

function renderRepos(repos) {
  const list = document.getElementById("repo-list");
  list.textContent = "";
  if (!repos.length) {
    list.textContent = "No repositories found.";
    return;
  }
  for (const repo of repos) {
    const row = document.createElement("a");
    row.className = "repo-row";
    row.href = repo.url;
    row.target = "_blank";
    row.rel = "noopener";

    const path = document.createElement("span");
    path.className = "repo-path";
    path.textContent = repo.fullName;

    const desc = document.createElement("span");
    desc.className = "repo-desc";
    desc.textContent = repo.description || "No description provided";

    const lang = document.createElement("span");
    lang.className = "repo-lang";
    lang.textContent = repo.language || "—";

    const stars = document.createElement("span");
    stars.className = "repo-stars";
    stars.textContent = "★ " + repo.stars;

    row.append(path, desc, lang, stars);
    list.appendChild(row);
  }
}

function initGithub() {
  const cached = githubReposCache.load();
  if (cached) { renderRepos(cached); return; }
  fetchTopRepos().then(
    repos => { renderRepos(repos); githubReposCache.save(repos); },
    err => {
      console.warn("[github] fetch failed:", err.message);
      document.getElementById("repo-list").textContent = "Couldn't load repositories — see console.";
    }
  );
}

// ── Course notes (real files from github.com/PodorCN/Git_UWnotes) ──

const NOTES_REPO = "PodorCN/Git_UWnotes";
const NOTES_CACHE_KEY = "podorm_notes_cache_v1";
const notesCache = makeDailyCache(NOTES_CACHE_KEY);

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return Math.round(kb) + " KB";
  return (kb / 1024).toFixed(1) + " MB";
}

async function fetchNotes() {
  const res = await fetch(`https://api.github.com/repos/${NOTES_REPO}/contents/`);
  const items = await res.json();
  if (!Array.isArray(items)) throw new Error((items && items.message) || "GitHub API error");
  return items
    .filter(it => it.type === "file" && /\.pdf$/i.test(it.name) && !/test|^www\.pdf$/i.test(it.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(it => ({ name: it.name.replace(/\.pdf$/i, ""), url: it.html_url, size: it.size }));
}

function renderNotes(notes) {
  const list = document.getElementById("notes-list");
  list.textContent = "";
  if (!notes.length) {
    list.textContent = "No notes found.";
    return;
  }
  for (const note of notes) {
    const card = document.createElement("a");
    card.className = "card elev-sm note-card";
    card.href = note.url;
    card.target = "_blank";
    card.rel = "noopener";

    const kicker = document.createElement("div");
    kicker.className = "card-kicker";
    kicker.textContent = "Course notes · PDF";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = note.name;

    const body = document.createElement("div");
    body.className = "card-body";
    body.textContent = formatBytes(note.size);

    card.append(kicker, title, body);
    list.appendChild(card);
  }
}

function initNotes() {
  const cached = notesCache.load();
  if (cached) { renderNotes(cached); return; }
  fetchNotes().then(
    notes => { renderNotes(notes); notesCache.save(notes); },
    err => {
      console.warn("[notes] fetch failed:", err.message);
      document.getElementById("notes-list").textContent = "Couldn't load notes — see console.";
    }
  );
}

initMarket();
initGithub();
// initNotes(); — temp disabled along with the #notes section in index.html; function kept for when it's back.
