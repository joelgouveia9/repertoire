import type { Artist, Song } from "./types";
import { estimateAnnualRoyalty } from "./royalty-model";

// ─────────────────────────────────────────────────────────────────────────────
// Spotify integration (server-only).
//
// Uses the Client Credentials flow — an app-level token, no user login — which
// is enough to read public catalog data: an artist, their releases, and each
// recording's ISRC. Spotify does NOT expose songwriter/publisher splits, which
// is exactly the gap Repertoire exists to close: we get the recording truth here
// and report everything we still can't see as "unverified".
//
// Setup: create a free app at https://developer.spotify.com/dashboard and put
//   SPOTIFY_CLIENT_ID=...
//   SPOTIFY_CLIENT_SECRET=...
// in repertoire/.env.local. Without them, the UI shows a friendly connect prompt.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const MARKET = "US";

// Keep the catalog pull snappy. Spotify now 403s the batch endpoints
// (/tracks?ids=, /albums?ids=) for new apps, so we fetch tracks one-by-one with
// limited concurrency — these caps keep that bounded.
const MAX_ALBUMS = 25;
const MAX_TRACKS = 60;
const CONCURRENCY = 4;

/** Run `fn` over `items` with at most `n` in flight at once. */
async function mapPool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

export function spotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export class SpotifyError extends Error {
  constructor(message: string, readonly code: "no_creds" | "not_found" | "api" = "api") {
    super(message);
  }
}

// ── Auth (module-cached token) ───────────────────────────────────────────────
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (!spotifyConfigured()) throw new SpotifyError("Spotify credentials are not configured.", "no_creds");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.value;

  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new SpotifyError(`Spotify auth failed (${res.status}).`, "api");
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(path: string, attempt = 0): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });

  // Spotify rate-limits bursts (common from serverless IPs). Respect Retry-After.
  if ((res.status === 429 || res.status === 503) && attempt < 4) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 400;
    await sleep(Math.min(waitMs, 6000));
    return api<T>(path, attempt + 1);
  }
  if (res.status === 404) throw new SpotifyError("Not found on Spotify.", "not_found");
  if (!res.ok) throw new SpotifyError(`Spotify API error (${res.status}).`, "api");
  return (await res.json()) as T;
}

// ── Spotify response shapes (only the fields we use) ─────────────────────────
interface SpImage { url: string }
interface SpArtist { id: string; name: string; images: SpImage[]; followers: { total: number }; genres: string[] }
interface SpAlbum { id: string; name: string; release_date: string; album_group?: string }
interface SpTrack {
  id: string;
  name: string;
  popularity?: number | null; // nulled on restricted API tiers
  external_ids?: { isrc?: string };
  album?: { release_date?: string };
}

// ── Public surface ───────────────────────────────────────────────────────────

/** Extract a Spotify artist ID from a URL, URI, or raw ID; else null. */
export function parseArtistId(input: string): string | null {
  const trimmed = input.trim();
  const url = trimmed.match(/artist[/:]([a-zA-Z0-9]{22})/);
  if (url) return url[1];
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;
  return null;
}

export interface ArtistHit {
  id: string;
  name: string;
  image?: string;
  followers: number;
  genres: string[];
}

export async function searchArtists(query: string, limit = 6): Promise<ArtistHit[]> {
  const data = await api<{ artists: { items: SpArtist[] } }>(
    `/search?type=artist&limit=${limit}&q=${encodeURIComponent(query)}`
  );
  return data.artists.items.map((a) => ({
    id: a.id,
    name: a.name,
    image: a.images?.[0]?.url,
    followers: a.followers?.total ?? 0,
    genres: a.genres ?? [],
  }));
}

/** Pull an artist's catalog from Spotify and map it into our audit model. */
export async function getArtistCatalog(artistId: string): Promise<Artist> {
  const artist = await api<SpArtist>(`/artists/${artistId}`);

  // 1. Collect albums + singles (paginated).
  // NOTE: Spotify's /artists/{id}/albums endpoint now caps `limit` at ~10
  // (it 400s "Invalid limit" above that), so we page in small batches.
  const ALBUM_PAGE = 10;
  const albumIds: string[] = [];
  let offset = 0;
  while (albumIds.length < MAX_ALBUMS) {
    const page = await api<{ items: SpAlbum[]; next: string | null }>(
      `/artists/${artistId}/albums?include_groups=album,single&market=${MARKET}&limit=${ALBUM_PAGE}&offset=${offset}`
    );
    albumIds.push(...page.items.map((a) => a.id));
    if (!page.next) break;
    offset += ALBUM_PAGE;
  }

  // 2. Gather track IDs from each album (simplified track objects — no ISRC yet).
  const albumTrackLists = await mapPool(albumIds.slice(0, MAX_ALBUMS), CONCURRENCY, (albumId) =>
    api<{ items: { id: string }[] }>(`/albums/${albumId}/tracks?market=${MARKET}&limit=50`).catch(() => ({ items: [] }))
  );
  const trackIds = [...new Set(albumTrackLists.flatMap((t) => t.items.map((i) => i.id)))].slice(0, MAX_TRACKS);

  // 3. Hydrate each track individually (batch /tracks?ids= is 403-restricted) to
  //    get ISRC + popularity.
  const followers = artist.followers?.total ?? 0;
  const fullTracks = await mapPool(trackIds, CONCURRENCY, (id) =>
    api<SpTrack>(`/tracks/${id}?market=${MARKET}`).catch(() => null)
  );

  const songs: Song[] = [];
  const seenIsrc = new Set<string>();
  for (const t of fullTracks) {
    const isrc = t?.external_ids?.isrc;
    if (!t || !isrc || seenIsrc.has(isrc)) continue; // de-dupe re-releases by recording
    seenIsrc.add(isrc);
    songs.push({
      title: t.name,
      isrc,
      spotifyId: t.id,
      releaseDate: t.album?.release_date,
      territories: ["United States"], // assumed home market; refined when artist confirms
      expectedWriters: [], // Spotify doesn't expose writers/splits — the core gap
      expectedPublishers: [],
      registrations: [],
      registrationsKnown: false, // we see the recording, not its registrations
      popularity: t.popularity ?? undefined,
      estAnnualRoyalty: estimateAnnualRoyalty(t.popularity, followers),
    });
  }

  // Most relevant first.
  songs.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  return {
    slug: artist.id,
    name: artist.name,
    image: artist.images?.[0]?.url,
    homeTerritory: "United States",
    spotifyId: artist.id,
    spotifyUrl: `https://open.spotify.com/artist/${artist.id}`,
    followers: artist.followers?.total ?? 0,
    groundTruth: "distributor",
    live: true,
    songs,
  };
}
