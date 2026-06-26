import { unstable_cache } from "next/cache";
import type { Artist, Song } from "./types";
import { estimateAnnualRoyaltyFromRank } from "./royalty-model";
import { enrichByIsrc } from "./musicbrainz";
import { inferTerritory } from "./territory";
import { CatalogError, pool, sleep } from "./source-util";

// ─────────────────────────────────────────────────────────────────────────────
// Deezer catalog source.
//
// Deezer's public API is free, needs no auth, and crucially returns COMPLETE DSP
// catalogs — every album + track an artist has — with ISRCs embedded right in the
// album track lists and artist artwork included. That makes it the best identity/
// catalog source for indie artists (where MusicBrainz is too sparse). MusicBrainz
// is then used only to enrich a bounded set with ISWC + songwriters.
//
// Docs: https://developers.deezer.com/api
// ─────────────────────────────────────────────────────────────────────────────

const API = "https://api.deezer.com";
const MAX_ALBUMS = 100;
const ALBUM_CONCURRENCY = 4;
const ENRICH_CAP = 12;

interface DzError {
  error?: { type?: string; message?: string; code?: number };
}
async function dz<T>(path: string, attempt = 0): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (res.status === 429 && attempt < 4) {
    await sleep(700 * (attempt + 1));
    return dz<T>(path, attempt + 1);
  }
  if (!res.ok) throw new CatalogError(`Deezer error (${res.status}).`, "api");
  const json = (await res.json()) as T & DzError;
  if (json?.error) {
    // code 4 = quota; back off and retry.
    if (json.error.code === 4 && attempt < 5) {
      await sleep(900 * (attempt + 1));
      return dz<T>(path, attempt + 1);
    }
    if (json.error.code === 800 || json.error.code === 100)
      throw new CatalogError("Artist not found.", "not_found");
    throw new CatalogError(json.error.message || "Deezer error.", "api");
  }
  return json;
}

interface DzArtist {
  id: number;
  name: string;
  nb_album?: number;
  nb_fan?: number;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
}
interface DzAlbum {
  id: number;
  title?: string;
  release_date?: string;
}
interface DzTrack {
  title: string;
  isrc?: string;
  release_date?: string;
  rank?: number; // Deezer popularity score per track — drives per-song estimates
}

// ── Public surface ───────────────────────────────────────────────────────────

/** Extract a Deezer artist id from a URL or raw numeric id; else null. */
export function parseArtistId(input: string): string | null {
  const s = input.trim();
  const url = s.match(/artist\/(\d+)/);
  if (url) return url[1];
  if (/^\d+$/.test(s)) return s;
  return null;
}

export interface ArtistHit {
  id: string;
  name: string;
  image?: string;
  fans?: number;
  albums?: number;
}

export async function searchArtists(query: string, limit = 10): Promise<ArtistHit[]> {
  const data = await dz<{ data: DzArtist[] }>(
    `/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return (data.data ?? []).map((a) => ({
    id: String(a.id),
    name: a.name,
    image: a.picture_medium,
    fans: a.nb_fan,
    albums: a.nb_album,
  }));
}

/** Pull an artist's full catalog from Deezer, mapped into our audit model. Cached 1h. */
export function getArtistCatalog(id: string): Promise<Artist> {
  return unstable_cache(() => fetchArtistCatalog(id), ["dz-catalog-v3-rank", id], { revalidate: 3600 })();
}

async function fetchArtistCatalog(id: string): Promise<Artist> {
  const artist = await dz<DzArtist>(`/artist/${id}`);

  // 1. All albums + singles (paginate if needed).
  const albums: DzAlbum[] = [];
  let index = 0;
  while (albums.length < MAX_ALBUMS) {
    const page = await dz<{ data: DzAlbum[]; next?: string }>(
      `/artist/${id}/albums?limit=100&index=${index}`
    );
    albums.push(...(page.data ?? []));
    if (!page.next || (page.data ?? []).length === 0) break;
    index += 100;
  }

  // 2. Every track per album — Deezer's album track lists carry ISRCs directly.
  const trackLists = await pool(albums.slice(0, MAX_ALBUMS), ALBUM_CONCURRENCY, async (alb) => {
    const r = await dz<{ data: DzTrack[] }>(`/album/${alb.id}/tracks?limit=300`);
    return { alb, tracks: r.data ?? [] };
  });

  // 3. De-dupe by ISRC across albums (singles re-release album tracks).
  const seen = new Set<string>();
  const songs: Song[] = [];
  for (const entry of trackLists) {
    if (!entry) continue;
    for (const t of entry.tracks) {
      const isrc = t.isrc;
      if (!isrc || seen.has(isrc)) continue;
      seen.add(isrc);
      songs.push({
        title: t.title,
        isrc,
        releaseDate: t.release_date || entry.alb.release_date || undefined,
        territories: ["United States"], // set below from ISRC majority
        expectedWriters: [],
        expectedPublishers: [],
        registrations: [],
        registrationsKnown: false,
        popularity: t.rank,
        estAnnualRoyalty: estimateAnnualRoyaltyFromRank(t.rank),
      });
    }
  }

  const territory = inferTerritory(songs.map((s) => s.isrc));
  songs.forEach((s) => (s.territories = [territory]));
  songs.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));

  // 4. Best-effort: resolve ISWC + songwriters for the most recent works.
  const enrich = await enrichByIsrc(
    songs.map((s) => s.isrc),
    ENRICH_CAP
  );
  for (const s of songs) {
    const info = enrich.get(s.isrc);
    if (info) {
      if (info.iswc) s.iswc = info.iswc;
      if (info.writers.length) s.expectedWriters = info.writers;
    }
  }

  return {
    slug: String(artist.id),
    name: artist.name,
    image: artist.picture_xl || artist.picture_big || artist.picture_medium,
    homeTerritory: territory,
    live: true,
    source: "Deezer",
    groundTruth: "distributor",
    followers: artist.nb_fan,
    songs,
  };
}
