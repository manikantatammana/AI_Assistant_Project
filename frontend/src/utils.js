// ---------- Dates ----------
// The backend stores UTC datetimes but FastAPI serialises them without a
// timezone suffix ("2026-11-22T11:13:00.123000"). Browsers would read that as
// *local* time and show the wrong hour, so we pin it to UTC here.
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  let s = String(value);
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += "Z";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return "";
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(value) {
  const d = parseDate(value);
  return d
    ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";
}

export function formatTime(value) {
  const d = parseDate(value);
  return d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}

// Group chats into Today / Yesterday / Previous 7 days / Earlier
export function groupByDate(items, key = "updated_at") {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86400000;
  const buckets = [
    ["Today", []],
    ["Yesterday", []],
    ["Previous 7 days", []],
    ["Earlier", []],
  ];
  for (const item of items) {
    const d = parseDate(item[key]);
    const diff = d ? startOfToday.getTime() - d.getTime() : Infinity;
    if (diff <= 0) buckets[0][1].push(item);
    else if (diff <= day) buckets[1][1].push(item);
    else if (diff <= 7 * day) buckets[2][1].push(item);
    else buckets[3][1].push(item);
  }
  return buckets.filter(([, list]) => list.length > 0);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ---------- Resume analysis parsing ----------
// The backend prompt asks Gemini for six numbered sections. The reply is
// markdown text. We split it into those sections so each can get its own
// card; if the model ignores the format we fall back to one markdown block.
const SECTION_DEFS = [
  { key: "summary", match: /summary/i, title: "Resume Summary" },
  { key: "skills", match: /skill/i, title: "Technical Skills" },
  { key: "strengths", match: /strength/i, title: "Key Strengths" },
  { key: "weaknesses", match: /weakness/i, title: "Weaknesses" },
  { key: "improvements", match: /improve/i, title: "Areas for Improvement" },
  { key: "feedback", match: /overall|feedback/i, title: "Overall Feedback" },
];

const HEADING_RE =
  /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(?:\d+[.)]\s*)?(?:\*\*|__)?\s*([A-Za-z][A-Za-z &/-]{3,40}?)\s*(?:\*\*|__)?\s*:?\s*(?:\*\*|__)?\s*$/;

function matchHeading(line) {
  const m = line.match(HEADING_RE);
  if (!m) return null;
  const text = m[1];
  // Must look like a heading (numbered / bold / #), not a plain sentence.
  const looksLikeHeading = /^\s*(#{1,6}\s|\*\*|__|\d+[.)])/.test(line);
  if (!looksLikeHeading) return null;
  return SECTION_DEFS.find((d) => d.match.test(text)) || null;
}

export function parseAnalysis(raw) {
  if (raw == null) return { sections: [], raw: "" };
  const text =
    typeof raw === "string" ? raw : "```json\n" + JSON.stringify(raw, null, 2) + "\n```";

  const lines = text.replace(/\r/g, "").split("\n");
  const found = [];
  let current = null;
  const preamble = [];

  for (const line of lines) {
    const def = matchHeading(line);
    if (def && !found.some((s) => s.key === def.key)) {
      current = { ...def, body: [] };
      found.push(current);
    } else if (current) {
      current.body.push(line);
    } else {
      preamble.push(line);
    }
  }

  const sections = found
    .map((s) => ({ key: s.key, title: s.title, body: s.body.join("\n").trim() }))
    .filter((s) => s.body);

  if (sections.length < 3) {
    return { sections: [], raw: text };
  }
  return { sections, raw: text };
}

// Pull "- item" / "* item" lines out of a markdown block (for skill chips).
export function extractBullets(markdown) {
  const items = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*\S)/);
    if (m) items.push(m[1].replace(/\*\*/g, "").trim());
  }
  return items;
}

// Strip markdown emphasis for plain-text copy/export
export function toPlainText(markdown) {
  return markdown.replace(/\*\*/g, "").replace(/^#{1,6}\s*/gm, "");
}
