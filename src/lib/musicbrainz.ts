import { unstable_cache } from "next/cache";
import type { Artist, Song } from "./types";
import { estimateAnnualRoyalty } from "./royalty-model";

// ─────────────────────────────────────────────────────────────────────────────
// MusicBrainz catalog source.
//
// MusicBrainz is a free, open, public music encyclopedia — no API keys, no quota
// games. Crucially it returns ISRCs in BULK: one "browse recordings by artist"
// call returns up to 100 recordings WITH their ISRCs, versus Spotify's one-call-
// per-track (which their new-app tier rate-limits to death). It also exposes the
// artist's country, so we can pick the correct home territory automatically.
//
// Etiquette: MusicBrainz asks for a descriptive User-Agent and ~1 request/sec.
// Our audit makes only 2–3 calls and caches for an hour, so we stay well within.
// Docs: https://musicbrainz.org/doc/MusicBrainz_API
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://musicbrainz.org/ws/2";
const UA = "Repertoire/0.1 ( https://repertoire-two.vercel.app )";
const PAGE = 100;
const MAX_RECORDINGS = 200;

export class CatalogError extends Error {
  constructor(message: string, readonly code: "not_found" | "api" = "api") {
    super(message);
  }
}

async function mb<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) throw new CatalogError("Artist not found.", "not_found");
  if (!res.ok) throw new CatalogError(`MusicBrainz error (${res.status}).`, "api");
  return (await res.json()) as T;
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
interface MbRecording {
  id: string;
  title: string;
  isrcs?: string[];
  "first-release-date"?: string;
}

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
}

export async function searchArtists(query: string, limit = 8): Promise<ArtistHit[]> {
  const data = await mb<{ artists: (MbArtist & { score?: number })[] }>(
    `/artist?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`
  );
  return (data.artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    territory: territoryFor(a.country),
    disambiguation: a.disambiguation || a.area?.name,
    type: a.type,
  }));
}

/** Pull an artist's catalog from MusicBrainz, mapped into our audit model. Cached 1h. */
export function getArtistCatalog(mbid: string): Promise<Artist> {
  return unstable_cache(() => fetchArtistCatalog(mbid), ["mb-catalog", mbid], { revalidate: 3600 })();
}

async function fetchArtistCatalog(mbid: string): Promise<Artist> {
  const artist = await mb<MbArtist>(`/artist/${mbid}?fmt=json`);
  const territory = territoryFor(artist.country);

  // Browse recordings by artist, including ISRCs — bulk, one call per 100.
  const recordings: MbRecording[] = [];
  for (let offset = 0; offset < MAX_RECORDINGS; offset += PAGE) {
    const page = await mb<{ recordings: MbRecording[]; "recording-count": number }>(
      `/recording?artist=${mbid}&inc=isrcs&limit=${PAGE}&offset=${offset}&fmt=json`
    );
    recordings.push(...(page.recordings ?? []));
    if (offset + PAGE >= (page["recording-count"] ?? 0)) break;
  }

  // Keep only recordings that actually have an ISRC (i.e. real released recordings),
  // de-duped by ISRC.
  const songs: Song[] = [];
  const seen = new Set<string>();
  for (const r of recordings) {
    const isrc = r.isrcs?.[0];
    if (!isrc || seen.has(isrc)) continue;
    seen.add(isrc);
    songs.push({
      title: r.title,
      isrc,
      releaseDate: r["first-release-date"] || undefined,
      territories: [territory],
      expectedWriters: [],
      expectedPublishers: [],
      registrations: [],
      registrationsKnown: false, // we have the recording, not its registrations
      estAnnualRoyalty: estimateAnnualRoyalty(null, null), // no play data → baseline
    });
  }

  // Newest first (best-known proxy without play data).
  songs.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));

  return {
    slug: artist.id,
    name: artist.name,
    homeTerritory: territory,
    live: true,
    source: "MusicBrainz",
    songs,
  };
}
