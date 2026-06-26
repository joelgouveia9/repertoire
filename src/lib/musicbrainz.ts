import { unstable_cache } from "next/cache";
import type { Artist, Party, Song } from "./types";
import { estimateAnnualRoyalty } from "./royalty-model";
import { imageForArtist } from "./artwork";

// ─────────────────────────────────────────────────────────────────────────────
// MusicBrainz catalog source + composition enrichment.
//
// MusicBrainz is a free, open, public music encyclopedia — no API keys, no quota
// games. It returns ISRCs in BULK (one "browse recordings" call per 100), exposes
// the artist's country (→ home territory), AND models the recording → WORK →
// songwriter graph. That last part lets us resolve a song's real composers and
// ISWC from public data alone — the "trace the song back to its creator" half of
// the vision — without any PRO access.
//
// Etiquette: MusicBrainz asks for a descriptive User-Agent and ~1 request/sec.
// We bound the work-enrichment fan-out and cache results for an hour.
// Docs: https://musicbrainz.org/doc/MusicBrainz_API
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://musicbrainz.org/ws/2";
const UA = "Repertoire/0.1 ( https://repertoire-two.vercel.app )";
const PAGE = 100;
const MAX_RECORDINGS = 200;
const MAX_WORKS = 35; // cap composition lookups so first load stays reasonable
const WORK_CONCURRENCY = 3;

export class CatalogError extends Error {
  constructor(message: string, readonly code: "not_found" | "api" = "api") {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mb<T>(path: string, attempt = 0): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  // MusicBrainz throttles with 503 when over ~1 req/sec. Back off briefly.
  if (res.status === 503 && attempt < 3) {
    await sleep(1000 * (attempt + 1));
    return mb<T>(path, attempt + 1);
  }
  if (res.status === 404) throw new CatalogError("Artist not found.", "not_found");
  if (!res.ok) throw new CatalogError(`MusicBrainz error (${res.status}).`, "api");
  return (await res.json()) as T;
}

/** Run `fn` over `items` with at most `n` in flight; failures resolve to null. */
async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx]);
      } catch {
        out[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

// ── ISO country code → our registry territory names ──────────────────────────
const COUNTRY_TO_TERRITORY: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico",
  GB: "United Kingdom", IE: "Ireland",
  FR: "France", DE: "Germany", IT: "Italy", ES: "Spain", PT: "Portugal",
  NL: "Netherlands", BE: "Belgium", CH: "Switzerland", AT: "Austria",
  SE: "Sweden", DK: "Denmark", NO: "Norway", FI: "Finland",
  PL: "Poland", CZ: "Czech Republic", HU: "Hungary", RU: "Russia",
  BR: "Brazil", AR: "Argentina", CL: "Chile", CO: "Colombia",
  JP: "Japan", KR: "South Korea", CN: "China", IN: "India",
  HK: "Hong Kong", SG: "Singapore", MY: "Malaysia", ID: "Indonesia",
  PH: "Philippines", TW: "Taiwan", AU: "Australia", NZ: "Australia",
  IL: "Israel", ZA: "South Africa",
};

function territoryFor(country?: string | null): string {
  return (country && COUNTRY_TO_TERRITORY[country]) || "United States";
}

// ── MusicBrainz response shapes (only fields we use) ─────────────────────────
interface MbArtist {
  id: string;
  name: string;
  country?: string | null;
  disambiguation?: string;
  type?: string;
  area?: { name?: string };
}
interface MbRelation {
  type?: string;
  work?: { id: string; title?: string; iswcs?: string[] };
  artist?: { id: string; name: string };
}
interface MbRecording {
  id: string;
  title: string;
  isrcs?: string[];
  "first-release-date"?: string;
  relations?: MbRelation[];
}
interface MbWork {
  id: string;
  title?: string;
  iswcs?: string[];
  relations?: MbRelation[];
}

// MusicBrainz relationship types that denote a songwriter credit.
const WRITER_TYPES = new Set(["composer", "lyricist", "writer", "songwriter", "arranger"]);

// ── Public surface ───────────────────────────────────────────────────────────

/** Extract a MusicBrainz artist MBID from a URL or raw UUID; else null. */
export function parseArtistId(input: string): string | null {
  const s = input.trim();
  const uuid = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuid ? uuid[0] : null;
}

export interface ArtistHit {
  id: string;
  name: string;
  territory: string;
  disambiguation?: string;
  type?: string;
  image?: string;
}

export async function searchArtists(query: string, limit = 8): Promise<ArtistHit[]> {
  const data = await mb<{ artists: (MbArtist & { score?: number })[] }>(
    `/artist?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`
  );
  const hits: ArtistHit[] = (data.artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    territory: territoryFor(a.country),
    disambiguation: a.disambiguation || a.area?.name,
    type: a.type,
  }));
  // MusicBrainz drives identity; Spotify supplies artwork — one lookup per artist.
  const images = await pool(hits, 4, (h) => imageForArtist(h.name));
  hits.forEach((h, i) => (h.image = images[i] ?? undefined));
  return hits;
}

/** Pull an artist's catalog from MusicBrainz, mapped into our audit model. Cached 1h. */
export function getArtistCatalog(mbid: string): Promise<Artist> {
  return unstable_cache(() => fetchArtistCatalog(mbid), ["mb-catalog-v3", mbid], { revalidate: 3600 })();
}

/** Fetch one work's ISWC + deduped songwriters. */
async function fetchWork(workId: string): Promise<{ iswc?: string; writers: Party[] }> {
  const w = await mb<MbWork>(`/work/${workId}?inc=artist-rels&fmt=json`);
  const seen = new Set<string>();
  const writers: Party[] = [];
  for (const rel of w.relations ?? []) {
    if (rel.artist && WRITER_TYPES.has((rel.type ?? "").toLowerCase())) {
      const key = rel.artist.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        writers.push({ name: rel.artist.name, role: "writer" });
      }
    }
  }
  return { iswc: w.iswcs?.[0], writers };
}

async function fetchArtistCatalog(mbid: string): Promise<Artist> {
  const artist = await mb<MbArtist>(`/artist/${mbid}?fmt=json`);
  const territory = territoryFor(artist.country);
  const imagePromise = imageForArtist(artist.name); // kicks off in parallel with recordings

  // Browse recordings by artist, including ISRCs and the linked composition (work).
  const recordings: MbRecording[] = [];
  for (let offset = 0; offset < MAX_RECORDINGS; offset += PAGE) {
    const page = await mb<{ recordings: MbRecording[]; "recording-count": number }>(
      `/recording?artist=${mbid}&inc=isrcs+work-rels&limit=${PAGE}&offset=${offset}&fmt=json`
    );
    recordings.push(...(page.recordings ?? []));
    if (offset + PAGE >= (page["recording-count"] ?? 0)) break;
  }

  // Keep recordings that have an ISRC (real released recordings), de-duped by ISRC.
  // Capture the linked work id so we can resolve composers + ISWC next.
  const seenIsrc = new Set<string>();
  const entries: { song: Song; workId?: string }[] = [];
  for (const r of recordings) {
    const isrc = r.isrcs?.[0];
    if (!isrc || seenIsrc.has(isrc)) continue;
    seenIsrc.add(isrc);
    const workRel = r.relations?.find((rel) => rel.work);
    entries.push({
      workId: workRel?.work?.id,
      song: {
        title: r.title,
        isrc,
        iswc: workRel?.work?.iswcs?.[0], // may be filled in by enrichment below
        releaseDate: r["first-release-date"] || undefined,
        territories: [territory],
        expectedWriters: [],
        expectedPublishers: [],
        registrations: [],
        registrationsKnown: false,
        estAnnualRoyalty: estimateAnnualRoyalty(null, null),
      },
    });
  }

  // Newest first (best proxy without play data), then enrich the top works.
  entries.sort((a, b) => (b.song.releaseDate ?? "").localeCompare(a.song.releaseDate ?? ""));

  // Resolve composers + ISWC for unique works, bounded to keep load times sane.
  const uniqueWorkIds: string[] = [];
  const workSeen = new Set<string>();
  for (const e of entries) {
    if (e.workId && !workSeen.has(e.workId)) {
      workSeen.add(e.workId);
      uniqueWorkIds.push(e.workId);
      if (uniqueWorkIds.length >= MAX_WORKS) break;
    }
  }
  const resolved = await pool(uniqueWorkIds, WORK_CONCURRENCY, fetchWork);
  const workMap = new Map<string, { iswc?: string; writers: Party[] }>();
  uniqueWorkIds.forEach((id, i) => {
    const r = resolved[i];
    if (r) workMap.set(id, r);
  });

  const songs = entries.map(({ song, workId }) => {
    const info = workId ? workMap.get(workId) : undefined;
    if (info) {
      if (info.iswc) song.iswc = info.iswc;
      if (info.writers.length) song.expectedWriters = info.writers;
    }
    return song;
  });

  return {
    slug: artist.id,
    name: artist.name,
    image: await imagePromise,
    homeTerritory: territory,
    live: true,
    source: "MusicBrainz",
    groundTruth: "distributor",
    songs,
  };
}
