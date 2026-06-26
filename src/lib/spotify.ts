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

// Keep the catalog pull snappy.
const MAX_ALBUMS = 40;
const MAX_TRACKS = 120;

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

async function api<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
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
  popularity: number;
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
  const albumIds: string[] = [];
  let offset = 0;
  while (albumIds.length < MAX_ALBUMS) {
    const page = await api<{ items: SpAlbum[]; next: string | null }>(
      `/artists/${artistId}/albums?include_groups=album,single&market=${MARKET}&limit=50&offset=${offset}`
    );
    albumIds.push(...page.items.map((a) => a.id));
    if (!page.next) break;
    offset += 50;
  }

  // 2. Gather track IDs from each album (simplified track objects — no ISRC yet).
  const trackIds: string[] = [];
  for (const albumId of albumIds.slice(0, MAX_ALBUMS)) {
    if (trackIds.length >= MAX_TRACKS) break;
    const tracks = await api<{ items: { id: string }[] }>(`/albums/${albumId}/tracks?market=${MARKET}&limit=50`);
    trackIds.push(...tracks.items.map((t) => t.id));
  }

  // 3. Hydrate full track objects in batches of 50 to get ISRC + popularity.
  const songs: Song[] = [];
  const seenIsrc = new Set<string>();
  const ids = [...new Set(trackIds)].slice(0, MAX_TRACKS);
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { tracks } = await api<{ tracks: SpTrack[] }>(`/tracks?market=${MARKET}&ids=${batch.join(",")}`);
    for (const t of tracks) {
      const isrc = t.external_ids?.isrc;
      if (!isrc || seenIsrc.has(isrc)) continue; // de-dupe re-releases by recording
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
        popularity: t.popularity,
        estAnnualRoyalty: estimateAnnualRoyalty(t.popularity, artist.followers?.total ?? 0),
      });
    }
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
