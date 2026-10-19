// ── PodorM Production Script (V1 Chromatic Ribbon Pop Full-Width Edition) ──

// ── Market data (Twelve Data API) ──
//
// Get a free key at https://twelvedata.com/pricing (no credit card, ~10 seconds)
// and paste it below. Free tier: 800 requests/day, 8 requests/minute.
const TWELVE_DATA_API_KEY = "80759d2a961f4a4395f2ef3acd8fe11d";

const INDICES = [
  { id: "i0", name: "S&P 500", ticker: "SPY", symbol: "SPY", color: "#1E3FD0" },
  { id: "i1", name: "NASDAQ Composite", ticker: "ONEQ", symbol: "ONEQ", color: "#E8A33A" },
  { id: "i2", name: "CSI 300", ticker: "ASHR", symbol: "ASHR", color: "#D9472F" },
  { id: "i3", name: "Japan (MSCI)", ticker: "EWJ", symbol: "EWJ", color: "#127A68" },
  { id: "i4", name: "Canada (MSCI)", ticker: "EWC", symbol: "EWC", color: "#127A68" },
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

let requestChain = Promise.resolve();
const FETCH_GAP_MS = 1200;

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

function latestDataDate(dataByIndex) {
  let max = null;
  for (const id in dataByIndex) {
    const arr = dataByIndex[id];
    const d = arr && arr[arr.length - 1] && arr[arr.length - 1].date;
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

function renderReturn(cfg, item) {
  const el = document.getElementById(cfg.id + "-return");
  const dateEl = document.getElementById(cfg.id + "-date");
  if (!el || !item || !Number.isFinite(item.pct)) return;
  const up = item.pct >= 0;
  el.textContent = (up ? "▲ +" : "▼ ") + Math.abs(item.pct).toFixed(2) + "%";
  el.classList.toggle("up", up);
  el.classList.toggle("down", !up);
  if (dateEl && item.date) {
    dateEl.textContent = `${cfg.ticker} · ${formatTooltipDate(item.date)}`;
  }
}

// 30-day daily-return line chart with chromatic fill and interactive hover readout
function renderChart(cfg, returns) {
  const container = document.getElementById(cfg.id + "-chart");
  if (!container) return;
  container.textContent = "";
  if (!returns || returns.length < 2) return;

  const VB_W = 340, VB_H = 88, PAD_Y = 10;
  const plotH = VB_H - PAD_Y * 2;
  const n = returns.length;
  const maxAbs = Math.max(...returns.map(r => Math.abs(r.pct)), 0.01) * 1.15;

  const x = i => (i / (n - 1)) * VB_W;
  const y = pct => PAD_Y + plotH / 2 - (pct / maxAbs) * (plotH / 2);
  const baselineY = y(0);

  const svg = svgEl("svg", { viewBox: `0 0 ${VB_W} ${VB_H}`, preserveAspectRatio: "none" });
  svg.style.width = "100%";
  svg.style.height = "88px";
  svg.style.overflow = "visible";
  svg.style.display = "block";

  // Dashed zero baseline
  svg.appendChild(svgEl("line", {
    x1: 0,
    y1: baselineY,
    x2: VB_W,
    y2: baselineY,
    stroke: "rgba(17, 19, 24, 0.18)",
    "stroke-dasharray": "3 3",
    "stroke-width": 1
  }));

  const d = returns.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(r.pct).toFixed(2)}`).join(" ");

  // Soft tinted area under curve
  const areaD = `${d} L${VB_W},${baselineY.toFixed(2)} L0,${baselineY.toFixed(2)} Z`;
  svg.appendChild(svgEl("path", {
    d: areaD,
    fill: cfg.color + "1A"
  }));

  // Main series curve
  svg.appendChild(svgEl("path", {
    d,
    fill: "none",
    stroke: cfg.color,
    "stroke-width": 3,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }));

  const last = returns[n - 1];
  svg.appendChild(svgEl("circle", {
    cx: x(n - 1),
    cy: y(last.pct),
    r: 4.5,
    fill: cfg.color,
    stroke: "#FAF6EE",
    "stroke-width": 2
  }));

  const hoverLine = svgEl("line", {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: VB_H,
    stroke: cfg.color,
    "stroke-width": 1.5
  });
  hoverLine.style.opacity = "0";
  hoverLine.style.pointerEvents = "none";

  const hoverDot = svgEl("circle", {
    r: 5.5,
    cx: 0,
    cy: 0,
    fill: "#fff",
    stroke: cfg.color,
    "stroke-width": 2.5
  });
  hoverDot.style.opacity = "0";
  hoverDot.style.pointerEvents = "none";

  svg.appendChild(hoverLine);
  svg.appendChild(hoverDot);

  const hitArea = svgEl("rect", {
    x: 0,
    y: 0,
    width: VB_W,
    height: VB_H,
    fill: "transparent"
  });
  hitArea.style.cursor = "crosshair";
  svg.appendChild(hitArea);

  function showAt(i) {
    const r = returns[i];
    hoverLine.setAttribute("x1", x(i));
    hoverLine.setAttribute("x2", x(i));
    hoverDot.setAttribute("cx", x(i));
    hoverDot.setAttribute("cy", y(r.pct));
    hoverLine.style.opacity = "0.7";
    hoverDot.style.opacity = "1";

    renderReturn(cfg, r);

    tooltipValueEl.textContent = (r.pct >= 0 ? "+" : "") + r.pct.toFixed(2) + "%";
    tooltipDateEl.textContent = `${cfg.ticker} · ${formatTooltipDate(r.date)}`;
    tooltipEl.hidden = false;
  }

  function hide() {
    hoverLine.style.opacity = "0";
    hoverDot.style.opacity = "0";
    tooltipEl.hidden = true;
    renderReturn(cfg, returns[n - 1]);
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
  if (!captionEl) return;
  if (!TWELVE_DATA_API_KEY || TWELVE_DATA_API_KEY === "YOUR_API_KEY_HERE") {
    captionEl.textContent = "Add a Twelve Data API key in script.js to enable live data";
    return;
  }

  const activeIndices = INDICES.filter(cfg => document.getElementById(cfg.id + "-chart"));

  function setCaption(dataByIndex) {
    const asOf = latestDataDate(dataByIndex);
    captionEl.textContent = "Daily return, last 30 sessions · ETF-tracked proxies via Twelve Data"
      + (asOf ? ` · data through ${formatLongDate(asOf)}` : "");
  }

  const cached = returnsCache.load();
  if (cached) {
    for (const cfg of activeIndices) {
      const series = cached[cfg.id];
      if (!series || !series.length) continue;
      renderReturn(cfg, series[series.length - 1]);
      renderChart(cfg, series);
    }
    setCaption(cached);
    return;
  }

  captionEl.textContent = "Loading market data…";
  const data = {};
  Promise.all(activeIndices.map(cfg =>
    fetchDailyReturns(cfg).then(
      returns => {
        data[cfg.id] = returns;
        renderReturn(cfg, returns[returns.length - 1]);
        renderChart(cfg, returns);
      },
      err => console.warn(`[market] fetch failed for ${cfg.name} (${cfg.symbol}):`, err.message)
    )
  )).then(() => {
    if (Object.keys(data).length > 0) {
      returnsCache.save(data);
    }
    setCaption(data);
  });
}

// ── Github (real repos via the public GitHub REST API — no token needed) ──

const GITHUB_USER = "PodorCN";
const GITHUB_REPOS_CACHE_KEY = "podorm_github_repos_cache_v2";
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
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
    }));
}

function renderRepos(repos) {
  const list = document.getElementById("repo-list");
  if (!list) return;
  list.textContent = "";
  if (!repos.length) {
    list.textContent = "No repositories found.";
    return;
  }
  for (const repo of repos) {
    const card = document.createElement("a");
    card.className = "repo-card";
    card.href = repo.url;
    card.target = "_blank";
    card.rel = "noopener";

    const topWrap = document.createElement("div");

    const badgeRow = document.createElement("div");
    badgeRow.className = "repo-badge-row";

    const tag = document.createElement("span");
    tag.className = "repo-tag";
    tag.textContent = repo.language || "Repository";

    const stars = document.createElement("span");
    stars.textContent = "★ " + repo.stars;

    badgeRow.append(tag, stars);

    const title = document.createElement("div");
    title.className = "repo-title";
    title.textContent = repo.name || repo.fullName;

    const desc = document.createElement("p");
    desc.className = "repo-desc";
    desc.textContent = repo.description || "Open-source quantitative & engineering repository by PodorCN.";

    topWrap.append(badgeRow, title, desc);

    const foot = document.createElement("div");
    foot.className = "repo-foot";

    const pathSpan = document.createElement("span");
    pathSpan.textContent = repo.fullName;

    const inspectSpan = document.createElement("span");
    inspectSpan.textContent = "Inspect Repo ↗";

    foot.append(pathSpan, inspectSpan);
    card.append(topWrap, foot);
    list.appendChild(card);
  }
}

function initGithub() {
  if (!document.getElementById("repo-list")) return;
  const cached = githubReposCache.load();
  if (cached) { renderRepos(cached); return; }
  fetchTopRepos().then(
    repos => { renderRepos(repos); githubReposCache.save(repos); },
    err => {
      console.warn("[github] fetch failed:", err.message);
      const el = document.getElementById("repo-list");
      if (el) el.textContent = "Couldn't load repositories — see console.";
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
  if (!list) return;
  list.textContent = "";
  if (!notes.length) {
    list.textContent = "No notes found.";
    return;
  }
  for (const note of notes) {
    const card = document.createElement("a");
    card.className = "note-pill-card";
    card.href = note.url;
    card.target = "_blank";
    card.rel = "noopener";

    const kicker = document.createElement("span");
    kicker.style.fontFamily = "'JetBrains Mono', monospace";
    kicker.style.fontSize = "11px";
    kicker.style.fontWeight = "700";
    kicker.style.opacity = "0.7";
    kicker.textContent = "COURSE NOTES · PDF · " + formatBytes(note.size);

    const title = document.createElement("strong");
    title.style.fontFamily = "'Syne', sans-serif";
    title.style.fontSize = "20px";
    title.style.lineHeight = "1.25";
    title.textContent = note.name;

    const action = document.createElement("span");
    action.style.fontFamily = "'JetBrains Mono', monospace";
    action.style.fontSize = "12px";
    action.style.fontWeight = "700";
    action.textContent = "Read PDF ↗";

    card.append(kicker, title, action);
    list.appendChild(card);
  }
}

function initNotes() {
  if (!document.getElementById("notes-list")) return;
  const cached = notesCache.load();
  if (cached) { renderNotes(cached); return; }
  fetchNotes().then(
    notes => { renderNotes(notes); notesCache.save(notes); },
    err => {
      console.warn("[notes] fetch failed:", err.message);
      const el = document.getElementById("notes-list");
      if (el) el.textContent = "Couldn't load notes — see console.";
    }
  );
}

initMarket();
initGithub();
initNotes();
