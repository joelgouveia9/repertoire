// ─────────────────────────────────────────────────────────────────────────────
// Royalty-statement parsing.
//
// This is the FIRST real registration-verification path: an artist uploads a
// statement (from their distributor or PRO) and we extract, per work, the hard
// evidence of what's registered and collecting — ISRC, ISWC, title, society and
// amount. Reconciled against the catalog, this turns "unverified" into verified.
//
// Statement layouts vary by source, so we detect columns by header keywords
// rather than assuming a fixed schema. Pure functions, runnable client-side.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, commas and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface StatementWork {
  title: string;
  isrc?: string;
  iswc?: string;
  society?: string;
  writers?: string;
  publisher?: string;
  workNumber?: string;
  amount?: number;
}

type ColKind =
  | "title"
  | "isrc"
  | "iswc"
  | "society"
  | "writers"
  | "publisher"
  | "workNumber"
  | "amount";

// Header keyword → column kind. First match wins.
const HEADER_PATTERNS: [ColKind, RegExp][] = [
  ["isrc", /\bisrc\b/i],
  ["iswc", /\biswc\b/i],
  ["workNumber", /work\s*(no|num|number|id|code)|tunecode|registration\s*(no|number)/i],
  ["title", /\b(title|song|track|work\s*title|composition)\b/i],
  ["writers", /\b(writer|composer|author|songwriter)s?\b/i],
  ["publisher", /\b(publisher|administrator|admin)\b/i],
  ["society", /\b(society|^pro$|collection|source|territory|cmo)\b/i],
  ["amount", /\b(amount|royalt|earning|revenue|net|gross|paid|payment|total)\b/i],
];

function detectColumns(header: string[]): Partial<Record<ColKind, number>> {
  const map: Partial<Record<ColKind, number>> = {};
  header.forEach((h, i) => {
    for (const [kind, re] of HEADER_PATTERNS) {
      if (map[kind] === undefined && re.test(h)) {
        map[kind] = i;
        break;
      }
    }
  });
  return map;
}

const ISRC_RE = /\b[A-Z]{2}[A-Z0-9]{3}\d{7}\b/;
const ISWC_RE = /\bT-?\d[\d.\s-]{8,}\b/;

function num(v?: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export interface ParsedStatement {
  works: StatementWork[];
  societies: string[];
  totalAmount: number;
  /** Columns we recognized — surfaced so the user can sanity-check the mapping. */
  detected: ColKind[];
  rowCount: number;
}

/** Parse a statement file's text into normalized works. */
export function parseStatement(text: string): ParsedStatement {
  const rows = parseCsv(text);
  if (rows.length < 2) return { works: [], societies: [], totalAmount: 0, detected: [], rowCount: 0 };

  const header = rows[0].map((h) => h.trim());
  const cols = detectColumns(header);
  const at = (row: string[], kind: ColKind) => {
    const i = cols[kind];
    return i === undefined ? "" : (row[i] ?? "").trim();
  };

  const works: StatementWork[] = [];
  const societies = new Set<string>();
  let totalAmount = 0;

  for (const row of rows.slice(1)) {
    const joined = row.join(" ");
    const isrc = (at(row, "isrc") || joined.match(ISRC_RE)?.[0] || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || undefined;
    const iswc = at(row, "iswc") || joined.match(ISWC_RE)?.[0] || undefined;
    const title = at(row, "title");
    const society = at(row, "society") || undefined;
    const amount = num(at(row, "amount"));
    if (!title && !isrc && !iswc) continue;

    if (society) societies.add(society);
    if (amount) totalAmount += amount;
    works.push({
      title: title || "(untitled)",
      isrc,
      iswc: iswc ? iswc.replace(/\s/g, "") : undefined,
      society,
      writers: at(row, "writers") || undefined,
      publisher: at(row, "publisher") || undefined,
      workNumber: at(row, "workNumber") || undefined,
      amount,
    });
  }

  return {
    works,
    societies: [...societies],
    totalAmount: Math.round(totalAmount * 100) / 100,
    detected: Object.keys(cols) as ColKind[],
    rowCount: works.length,
  };
}
