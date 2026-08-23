// Toronto Weekend — renders a Markdown data file into event sections.
// Data file: data/events.md
//
// The file is intentionally simple Markdown so it can be edited directly:
//
//   ---
//   title: Toronto Weekend
//   dates: Saturday Aug 22 – Sunday Aug 23
//   ---
//
//   ## Music & Nightlife
//
//   ### A show
//   - **Day:** Saturday / Sunday
//   - **When:** 7:00 PM
//   - **Where:** Some venue
//   - **Cost:** $20
//   - **Info:** A short description.
//   - **Tags:** music, live
//   - **Link:** [Tickets](https://example.com)

const DATA_URL = "data/events.md";

const FIELD_ALIASES = {
  when: "when",
  time: "when",
  date: "when",
  day: "day",
  where: "where",
  place: "where",
  venue: "where",
  location: "where",
  address: "where",
  cost: "cost",
  price: "cost",
  fee: "cost",
  admission: "cost",
  info: "desc",
  about: "desc",
  notes: "desc",
  description: "desc",
  link: "link",
  url: "link",
  tickets: "link",
  website: "link",
  tags: "tags",
  tag: "tags",
};

const DAYS = ["Friday", "Saturday", "Sunday"];

const state = {
  day: "all",
  section: "all",
};

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

// Minimal inline Markdown: links, **bold**, *italic*. HTML is escaped first.
function inlineMarkdown(value) {
  if (!value) return "";
  let html = escapeHTML(value);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return html;
}

function parseFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  if (!text.startsWith("---\n")) {
    return { meta: {}, body: text };
  }

  const firstNewline = text.indexOf("\n", 3);
  if (firstNewline === -1) {
    return { meta: {}, body: text };
  }

  const secondStart = text.indexOf("---", firstNewline + 1);
  if (secondStart === -1) {
    return { meta: {}, body: text };
  }

  const meta = {};
  const fmRaw = text.slice(4, secondStart).trim();
  fmRaw.split("\n").forEach((line) => {
    const colon = line.indexOf(":");
    if (colon > 0) {
      meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
  });

  const body = text.slice(secondStart + 3).replace(/^\n/, "");
  return { meta, body };
}

function normalizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function mapField(key) {
  const normalized = normalizeKey(key);
  return FIELD_ALIASES[normalized] || null;
}

function parseBulletField(bullet) {
  // Handles "- **Day:** Saturday", "- Day: Saturday", "- *Cost:* free".
  let stripped = bullet.replace(/^\*\*?/, "").replace(/^__?/, "").trim();
  const colon = stripped.indexOf(":");
  if (colon <= 0) return null;

  const key = stripped.slice(0, colon).replace(/[*_]+$/g, "").trim();
  if (!key) return null;

  let value = stripped.slice(colon + 1).trim();
  // The closing marker of "**Key:**" appears right after the colon.
  value = value.replace(/^\*\*/, "").replace(/^__/, "").replace(/^\*/, "").trim();
  return { key, value };
}

function parseBody(body) {
  const sections = [];
  let currentSection = null;
  let currentEvent = null;

  body.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("## ")) {
      currentSection = { title: trimmed.slice(3).trim(), events: [] };
      sections.push(currentSection);
      currentEvent = null;
    } else if (trimmed.startsWith("### ")) {
      if (!currentSection) {
        currentSection = { title: "Events", events: [] };
        sections.push(currentSection);
      }
      currentEvent = { title: trimmed.slice(4).trim(), fields: {}, info: [], description: "" };
      currentSection.events.push(currentEvent);
    } else if (trimmed.startsWith("#")) {
      // H1 and other headings are not used by the renderer.
      return;
    } else if (/^[-*]\s+/.test(trimmed) && currentEvent) {
      const bullet = trimmed.replace(/^[-*]\s+/, "");
      const parsed = parseBulletField(bullet);
      if (parsed) {
        const field = mapField(parsed.key);
        const value = parsed.value;
        if (field && value) {
          currentEvent.fields[field] = value;
        } else {
          currentEvent.info.push(bullet.trim());
        }
      } else {
        currentEvent.info.push(bullet.trim());
      }
    } else if (currentEvent) {
      currentEvent.description = currentEvent.description
        ? `${currentEvent.description} ${trimmed}`
        : trimmed;
    }
  });

  return sections;
}

function getEventDays(event) {
  const haystack = `${event.fields.day || ""} ${event.fields.when || ""}`;
  const days = [];
  DAYS.forEach((day) => {
    const token = day.slice(0, 3);
    if (new RegExp(`\\b${token}`, "i").test(haystack)) days.push(day);
  });
  return days;
}

function extractLink(text) {
  if (!text) return null;
  const markdown = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (markdown) return { text: markdown[1], url: markdown[2] };
  const url = text.match(/https?:\/\/[^\s)]+/);
  if (url) return { text: "More info", url: url[0] };
  return null;
}

function buildFilters(meta, sections) {
  const dayFilters = document.getElementById("day-filters");
  const sectionFilters = document.getElementById("section-filters");

  dayFilters.textContent = "";
  sectionFilters.textContent = "";

  const allDays = new Set();
  sections.forEach((section) => {
    section.events.forEach((event) => {
      getEventDays(event).forEach((day) => allDays.add(day));
    });
  });

  const dayLabel = el("span", "filter-label", "Day:");
  const sectionLabel = el("span", "filter-label", "Section:");
  dayFilters.appendChild(dayLabel);
  sectionFilters.appendChild(sectionLabel);

  const addButton = (container, label, value, group, onChange) => {
    const button = el("button", "filter-btn", label);
    button.type = "button";
    button.dataset.value = value;
    if (state[group] === value) button.classList.add("active");
    button.addEventListener("click", () => {
      state[group] = value;
      container.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.value === value));
      applyFilters(meta, sections);
    });
    container.appendChild(button);
  };

  addButton(dayFilters, "All", "all", "day", null);
  DAYS.forEach((day) => {
    if (allDays.has(day)) addButton(dayFilters, day, day, "day", null);
  });

  addButton(sectionFilters, "All", "all", "section", null);
  sections.forEach((section) => {
    addButton(sectionFilters, section.title, section.title, "section", null);
  });

  const toolbar = document.getElementById("toolbar");
  toolbar.hidden = sections.length === 0;
}

function renderEventCard(event) {
  const card = el("article", "event-card");

  const title = el("h3", "event-title");
  title.innerHTML = inlineMarkdown(event.title);
  card.appendChild(title);

  const chips = el("div", "event-day-tags");
  getEventDays(event).forEach((day) => chips.appendChild(el("span", "chip", day)));
  (event.fields.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => chips.appendChild(el("span", "chip", tag)));
  if (chips.childNodes.length) card.appendChild(chips);

  const descriptionParts = [];
  if (event.description) descriptionParts.push(event.description);
  if (event.fields.desc) descriptionParts.push(event.fields.desc);
  event.info.forEach((info) => descriptionParts.push(info));
  if (descriptionParts.length) {
    const desc = el("p", "event-desc");
    desc.innerHTML = inlineMarkdown(descriptionParts.join(" "));
    card.appendChild(desc);
  }

  const facts = el("div", "event-facts");
  [
    ["when", "When"],
    ["where", "Where"],
    ["cost", "Cost"],
  ].forEach(([field, label]) => {
    if (!event.fields[field]) return;
    const fact = el("div", "fact");
    fact.innerHTML = `<strong>${label}:</strong> ${inlineMarkdown(event.fields[field])}`;
    facts.appendChild(fact);
  });
  if (facts.childNodes.length) card.appendChild(facts);

  const link = extractLink(event.fields.link || descriptionParts.join(" "));
  if (link) {
    const anchor = el("a", "event-link", link.text || "More info");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    card.appendChild(anchor);
  }

  return card;
}

function dayMatches(event) {
  if (state.day === "all") return true;
  const days = getEventDays(event);
  return days.length === 0 || days.includes(state.day);
}

function applyFilters(meta, sections) {
  const container = document.getElementById("sections");
  container.textContent = "";

  let totalVisible = 0;
  sections.forEach((section) => {
    if (state.section !== "all" && section.title !== state.section) return;

    const visibleEvents = section.events.filter(dayMatches);
    if (visibleEvents.length === 0) return;
    totalVisible += visibleEvents.length;

    const block = el("section", "section-block");
    const head = el("div", "section-head");
    const title = el("h2", "section-title", section.title);
    const count = el("span", "section-count", `${visibleEvents.length}`);
    head.append(title, count);
    block.appendChild(head);

    const grid = el("div", "event-grid");
    visibleEvents.forEach((event) => grid.appendChild(renderEventCard(event)));
    block.appendChild(grid);
    container.appendChild(block);
  });

  if (totalVisible === 0) {
    container.appendChild(el("p", "loading", "No events match the current filter."));
  }
}

function renderPage(meta, sections) {
  document.title = `${meta.title || "Toronto Weekend"} · PodorM`;
  document.getElementById("page-title").textContent = meta.title || "Toronto Weekend";
  document.getElementById("page-dates").textContent = meta.dates || meta.weekend || "";
  document.getElementById("page-meta").textContent = [
    meta.updated ? `Updated ${meta.updated}` : "",
    meta.source || "",
  ].filter(Boolean).join(" · ");

  document.getElementById("weather-saturday").textContent = meta.weather_saturday || "—";
  document.getElementById("weather-sunday").textContent = meta.weather_sunday || "—";

  document.getElementById("footer-updated").textContent = meta.updated
    ? `updated ${meta.updated}`
    : "";

  buildFilters(meta, sections);
  applyFilters(meta, sections);
}

async function loadEvents() {
  try {
    const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status} ${res.statusText}`);
    const raw = await res.text();
    const { meta, body } = parseFrontmatter(raw);
    const sections = parseBody(body);
    renderPage(meta, sections);
  } catch (err) {
    const container = document.getElementById("sections");
    container.textContent = "";
    const message = el("p", "loading", `Could not load ${DATA_URL}: ${err.message}`);
    container.appendChild(message);
  }
}

loadEvents();