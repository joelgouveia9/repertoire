import type { Party } from "./types";
import { pool, sleep } from "./source-util";

// ─────────────────────────────────────────────────────────────────────────────
// MusicBrainz enrichment (best-effort).
//
// Deezer is the catalog source (complete DSP catalogs + ISRCs). MusicBrainz is
// used only to ENRICH: given a recording's ISRC, look up its composition (work)
// to resolve the real ISWC + songwriters — the "trace the song to its creator"
// feature. Coverage is good for established artists, sparse for new indie ones,
// so this is bounded and never blocks the catalog.
//
// Etiquette: descriptive User-Agent, ~1 req/sec (we cap the fan-out).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://musicbrainz.org/ws/2";
const UA = "Repertoire/0.1 ( https://repertoire-two.vercel.app )";

async function mb<T>(path: string, attempt = 0): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 503 && attempt < 2) {
    await sleep(1000 * (attempt + 1));
    return mb<T>(path, attempt + 1);
  }
  if (!res.ok) return null;
  return (await res.json()) as T;
}

interface MbRelation {
  type?: string;
  work?: { id: string; title?: string; iswcs?: string[] };
  artist?: { id: string; name: string };
}
interface MbRecording {
  id: string;
  relations?: MbRelation[];
}
interface MbWork {
  id: string;
  iswcs?: string[];
  relations?: MbRelation[];
}

const WRITER_TYPES = new Set(["composer", "lyricist", "writer", "songwriter", "arranger"]);

async function fetchWork(workId: string): Promise<{ iswc?: string; writers: Party[] }> {
  const w = await mb<MbWork>(`/work/${workId}?inc=artist-rels&fmt=json`);
  const writers: Party[] = [];
  const seen = new Set<string>();
  for (const rel of w?.relations ?? []) {
    if (rel.artist && WRITER_TYPES.has((rel.type ?? "").toLowerCase())) {
      const key = rel.artist.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        writers.push({ name: rel.artist.name, role: "writer" });
      }
    }
  }
  return { iswc: w?.iswcs?.[0], writers };
}

/**
 * Best-effort: for each ISRC, resolve the composition (ISWC + songwriters) via
 * MusicBrainz. Bounded fan-out; ISRCs not in MusicBrainz simply return nothing.
 */
export async function enrichByIsrc(
  isrcs: string[],
  cap = 12
): Promise<Map<string, { iswc?: string; writers: Party[] }>> {
  const out = new Map<string, { iswc?: string; writers: Party[] }>();
  const targets = isrcs.filter(Boolean).slice(0, cap);
  await pool(targets, 3, async (isrc) => {
    const data = await mb<{ recordings?: MbRecording[] }>(`/isrc/${isrc}?inc=work-rels&fmt=json`);
    const rec = data?.recordings?.find((r) => r.relations?.some((rel) => rel.work));
    const work = rec?.relations?.find((rel) => rel.work)?.work;
    if (!work) return null;
    const info = await fetchWork(work.id);
    // Prefer an ISWC from the work-rel stub if the detail call lacked one.
    if (!info.iswc && work.iswcs?.[0]) info.iswc = work.iswcs[0];
    if (info.iswc || info.writers.length) out.set(isrc, info);
    return null;
  });
  return out;
}
