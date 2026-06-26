// ─────────────────────────────────────────────────────────────────────────────
// Artist artwork (server-only).
//
// MusicBrainz is our catalog/identity source but has no artist images. Spotify's
// search endpoint DOES return artist artwork (even on the restricted app tier
// that nulls followers/popularity), so we use it purely for images — one search
// call per query, matched back to MusicBrainz artists by name. Fully optional:
// with no Spotify credentials, the UI just falls back to initials.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";

function configured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (!configured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.value;
  try {
    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return cachedToken.value;
  } catch {
    return null;
  }
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

interface SpImage { url: string; width: number }
interface SpArtist { name: string; images: SpImage[] }

/** Prefer a mid-size image (~320px) for crisp small avatars. */
function pickImage(images: SpImage[]): string | undefined {
  if (!images?.length) return undefined;
  return (images[1] ?? images[0])?.url;
}

async function search(query: string, limit: number): Promise<SpArtist[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API}/search?type=artist&limit=${limit}&q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { artists?: { items: SpArtist[] } };
    return data.artists?.items ?? [];
  } catch {
    return [];
  }
}

/** One Spotify search → map of normalized artist name → image URL. */
export async function imagesForQuery(query: string, limit = 10): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const a of await search(query, limit)) {
    const url = pickImage(a.images);
    const key = norm(a.name);
    if (url && key && !map.has(key)) map.set(key, url);
  }
  return map;
}

/** Best image for a single artist name (exact match preferred, else close). */
export async function imageForArtist(name: string): Promise<string | undefined> {
  const items = await search(name, 5);
  const target = norm(name);
  const exact = items.find((a) => norm(a.name) === target);
  if (exact) return pickImage(exact.images);
  const close = items.find((a) => {
    const n = norm(a.name);
    return n.includes(target) || target.includes(n);
  });
  return close ? pickImage(close.images) : undefined;
}
