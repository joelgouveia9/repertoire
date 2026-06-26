// Shared helpers for live catalog sources (Deezer, MusicBrainz).

export class CatalogError extends Error {
  constructor(message: string, readonly code: "not_found" | "api" = "api") {
    super(message);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run `fn` over `items` with at most `n` in flight; failures resolve to null. */
export async function pool<T, R>(
  items: T[],
  n: number,
  fn: (item: T) => Promise<R>
): Promise<(R | null)[]> {
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
