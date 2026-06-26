import type { Party } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Recording → Work matching.
//
// The core join of the whole platform: a Spotify recording gives us a TITLE and
// a PERFORMER; a PRO's public repertoire gives us a TITLE, the WRITERS/splits and
// (often) the PERFORMER. We reconcile the two with normalization + fuzzy scoring
// so that "Goldenhour - Remastered (feat. X)" on Spotify matches "GOLDENHOUR" in
// ASCAP's repertoire and we can pull the real writer splits onto the recording.
//
// This module is data-source agnostic: feed it candidate works from ANY registry
// (via `RepertoireSource`) and it returns the best match with a confidence score.
// The matching algorithm is fully testable today; only the live PRO feed is TBD.
// ─────────────────────────────────────────────────────────────────────────────

// ── Normalization ────────────────────────────────────────────────────────────

const VERSION_NOISE =
  /\b(remaster(ed)?|remix|re-?recorded|radio edit|edit|mix|mono|stereo|deluxe|expanded|bonus track|live|acoustic|instrumental|version|anniversary|single)\b/gi;

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Normalize a song title: drop feat./version cruft, punctuation, articles. */
export function normalizeTitle(raw: string): string {
  let s = stripDiacritics(raw).toLowerCase();
  s = s.replace(/\([^)]*\)|\[[^\]]*\]/g, " "); // remove parenthetical/bracketed content
  s = s.replace(/\b(feat|ft|featuring|with)\b.*$/i, " "); // drop trailing "feat ..."
  s = s.replace(/[-–—:].*$/g, (m) => (VERSION_NOISE.test(m) ? " " : m)); // drop "- Remastered" style suffixes
  s = s.replace(VERSION_NOISE, " ");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  s = s.replace(/^the\s+/, "");
  return s.replace(/\s+/g, " ");
}

/** Normalize a person/entity name; handles "Last, First" ordering. */
export function normalizeName(raw: string): string {
  let s = stripDiacritics(raw).toLowerCase().trim();
  const comma = s.match(/^([^,]+),\s*(.+)$/); // "Marsh, Diego" -> "diego marsh"
  if (comma) s = `${comma[2]} ${comma[1]}`;
  s = s.replace(/\b(the|llc|inc|ltd|music|publishing|songs|bmi|ascap|sesac|gmr)\b/g, " ");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  return s.replace(/\s+/g, " ");
}

// ── Similarity (Dice coefficient on character bigrams; no deps) ───────────────

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

/** 0..1 string similarity. 1 = identical. */
export function similarity(a: string, b: string): number {
  if (a === b) return a.length === 0 ? 0 : 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const counts = new Map<string, number>();
  for (const g of bigrams(b)) counts.set(g, (counts.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of A) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      inter++;
      counts.set(g, c - 1);
    }
  }
  return (2 * inter) / (A.length + bigrams(b).length);
}

/** Best similarity of `name` against any of a list of candidate names. */
function bestNameMatch(name: string, candidates: string[]): number {
  const n = normalizeName(name);
  let best = 0;
  for (const c of candidates) best = Math.max(best, similarity(n, normalizeName(c)));
  return best;
}

// ── Candidate works & sources ────────────────────────────────────────────────

/** A work as returned by a PRO/MRO repertoire search. */
export interface WorkCandidate {
  registryId: string;
  workNumber: string;
  title: string;
  writers: Party[];
  publishers?: Party[];
  performers?: string[];
  iswc?: string;
}

/** What we know about the recording we're trying to match. */
export interface RecordingQuery {
  title: string;
  performer: string;
  isrc?: string;
}

/** Pluggable connector to a single registry's public repertoire. */
export interface RepertoireSource {
  registryId: string;
  /** Search the registry by title (and ideally performer). */
  search(query: RecordingQuery): Promise<WorkCandidate[]>;
}

export interface MatchResult {
  candidate: WorkCandidate | null;
  /** 0..1 — how confident we are this work is the recording's composition. */
  confidence: number;
  titleScore: number;
  performerScore: number;
  reason: string;
}

/** Below this, we treat a title pairing as "not the same song". */
const TITLE_FLOOR = 0.6;
/** At/above this overall confidence we auto-attach the writers; between → "needs review". */
export const AUTO_MATCH = 0.82;
export const REVIEW_MATCH = 0.62;

/**
 * Pick the best matching work for a recording from a set of candidates.
 * Title is the dominant signal (0.7); performer presence among the work's
 * performers OR writers is the corroborating signal (0.3), since indie artists
 * frequently are their own writers.
 */
export function matchRecording(query: RecordingQuery, candidates: WorkCandidate[]): MatchResult {
  const qTitle = normalizeTitle(query.title);
  let best: MatchResult = {
    candidate: null,
    confidence: 0,
    titleScore: 0,
    performerScore: 0,
    reason: "No candidate works found in repertoire.",
  };

  for (const cand of candidates) {
    const titleScore = similarity(qTitle, normalizeTitle(cand.title));
    if (titleScore < TITLE_FLOOR) continue;

    const names = [...(cand.performers ?? []), ...cand.writers.map((w) => w.name)];
    const performerScore = bestNameMatch(query.performer, names);

    const confidence = +(titleScore * 0.7 + performerScore * 0.3).toFixed(3);
    if (confidence > best.confidence) {
      best = {
        candidate: cand,
        confidence,
        titleScore: +titleScore.toFixed(3),
        performerScore: +performerScore.toFixed(3),
        reason:
          confidence >= AUTO_MATCH
            ? "Strong title + performer match — writers attached automatically."
            : confidence >= REVIEW_MATCH
            ? "Likely match — flagged for human review before attaching splits."
            : "Weak match — title aligns but performer differs; not attached.",
      };
    }
  }

  return best;
}

/** Query every connected registry for a recording and return the best match across all. */
export async function resolveWork(
  query: RecordingQuery,
  sources: RepertoireSource[]
): Promise<MatchResult> {
  const all: WorkCandidate[] = [];
  for (const src of sources) {
    try {
      all.push(...(await src.search(query)));
    } catch {
      // A single registry being unreachable shouldn't fail the whole resolution.
    }
  }
  return matchRecording(query, all);
}
